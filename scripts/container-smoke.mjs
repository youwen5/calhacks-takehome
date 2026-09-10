import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

// Runs only local containers, with networking disabled and synthetic configuration.
const engine = process.env.CONTAINER_ENGINE || 'podman';
const image = process.env.SMOKE_IMAGE || 'calhacks-portal:local';
const suffix = `${process.pid}-${Date.now()}`;
const volume = `calhacks-smoke-${suffix}`,
  name = `calhacks-smoke-${suffix}`;
function run(args, allowedFailure = false) {
  const result = spawnSync(engine, args, { encoding: 'utf8' });
  if (result.status !== 0 && !allowedFailure)
    throw new Error(result.stderr || `Container command failed (${result.status})`);
  return result;
}
const env = [
  '-e',
  `BETTER_AUTH_SECRET=${randomBytes(48).toString('base64')}`,
  '-e',
  'BETTER_AUTH_URL=https://portal.example.test',
  '-e',
  'ORIGIN=https://portal.example.test',
  '-e',
  'MAIL_MODE=ses',
  '-e',
  'AWS_REGION=us-west-2',
  '-e',
  'AWS_SES_FROM=portal@example.test',
];
const persistedApplicationCheck = `
  const row=d.prepare("SELECT a.name, a.status, h.ambition FROM application a JOIN hacker_answer h ON h.applicationId=a.id WHERE a.id='smoke-application'").get();
  if(row?.name!=='Synthetic Builder'||row.status!=='submitted'||row.ambition!=='Learn together')process.exit(1);
  if(d.prepare('PRAGMA foreign_key_check').all().length)process.exit(1);
`;
function start() {
  run([
    'run',
    '-d',
    '--name',
    name,
    '--network=none',
    '--pull=never',
    '-v',
    `${volume}:/data`,
    ...env,
    image,
  ]);
}
async function ready() {
  for (let attempt = 0; attempt < 40; attempt++) {
    const r = run(
      [
        'exec',
        name,
        'node',
        '-e',
        `fetch('http://127.0.0.1:3000/events').then(async r => {if(!r.ok || !(await r.text()).includes('Cal Hacks')) process.exit(1)}).catch(()=>process.exit(1))`,
      ],
      true,
    );
    if (r.status === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Container did not become ready. ' + run(['logs', name], true).stderr);
}
try {
  run(['volume', 'create', volume]);
  start();
  await ready();
  run([
    'exec',
    name,
    'node',
    '-e',
    `const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/data/portal.db');d.exec(
      "BEGIN; INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES('smoke-user','Synthetic Builder','smoke@example.test',1,1,1);"+
      "INSERT INTO event(id,slug,name,description,venue,timezone,opensAt,closesAt,startsAt,endsAt,status) VALUES('smoke-event','smoke-event','Synthetic event','Container persistence test','Demo venue','UTC',1,2,3,4,'published');"+
      "INSERT INTO offered_type(eventId,type) VALUES('smoke-event','hacker');"+
      "INSERT INTO application(id,eventId,userId,type,status,name,formVersion,rubricVersion,updatedAt,submittedAt) VALUES('smoke-application','smoke-event','smoke-user','hacker','submitted','Synthetic Builder',1,1,1,1);"+
      "INSERT INTO hacker_answer(applicationId,interests,experience,ambition) VALUES('smoke-application','Community software','A test project','Learn together'); COMMIT;"
    );d.close()`,
  ]);
  run(['exec', name, 'calhacks-backup', '/data/backup.db']);
  run(['stop', '-t', '5', name]);
  run(['rm', name]);
  start();
  await ready();
  run([
    'exec',
    name,
    'node',
    '-e',
    `const {DatabaseSync}=require('node:sqlite');for(const file of ['portal.db','backup.db']) {const d=new DatabaseSync('/data/'+file);${persistedApplicationCheck}if(d.prepare('pragma integrity_check').get().integrity_check!=='ok')process.exit(1);d.close()}`,
  ]);
  run(['stop', '-t', '5', name]);
  run(['rm', name]);
  // Simulate an incompatible migration state. Startup must stop, not serve HTTP.
  run([
    'run',
    '--rm',
    '--network=none',
    '--pull=never',
    '-v',
    `${volume}:/data`,
    '--entrypoint',
    'node',
    image,
    '-e',
    `const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/data/portal.db');d.exec('DROP TABLE __drizzle_migrations');d.close()`,
  ]);
  const migrationFailure = run(
    ['run', '--rm', '--network=none', '--pull=never', '-v', `${volume}:/data`, ...env, image],
    true,
  );
  if (migrationFailure.status === 0 || !migrationFailure.stderr.includes('already exists'))
    throw new Error('Expected migration failure did not stop startup.');
  // Restore only with the application stopped, including removal of stale WAL files.
  run([
    'run',
    '--rm',
    '--network=none',
    '--pull=never',
    '-v',
    `${volume}:/data`,
    '--entrypoint',
    'node',
    image,
    '-e',
    `const fs=require('node:fs');for(const suffix of ['-wal','-shm'])fs.rmSync('/data/portal.db'+suffix,{force:true});fs.copyFileSync('/data/backup.db','/data/portal.db')`,
  ]);
  start();
  await ready();
  run([
    'exec',
    name,
    'node',
    '-e',
    `const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/data/portal.db');${persistedApplicationCheck}d.close()`,
  ]);
  // The fallback must remain unavailable in the actual production image.
  const rejected = run(
    ['run', '--rm', '--network=none', '--pull=never', ...env, '-e', 'MAIL_MODE=outbox', image],
    true,
  );
  if (rejected.status === 0 || !rejected.stderr.includes('development-only'))
    throw new Error('Production outbox was not rejected.');
  console.log(
    'Container smoke passed: migration, HTTP, persistence, migration failure, backup restoration, production mail guard. No external network used.',
  );
} finally {
  run(['rm', '-f', name], true);
  run(['volume', 'rm', volume], true);
}
