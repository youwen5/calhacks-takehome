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
  'MAIL_MODE=disabled',
  '-e',
  'DEMO_EMAIL_VERIFICATION=true',
];
const persistedApplicationCheck = `
  const row=d.prepare("SELECT a.name, a.status, h.ambition FROM application a JOIN hacker_answer h ON h.applicationId=a.id WHERE a.id='smoke-application'").get();
  if(row?.name!=='Synthetic Builder'||row.status!=='submitted'||row.ambition!=='Learn together')process.exit(1);
  const profile=d.prepare("SELECT major FROM hacker_profile WHERE applicationId='smoke-application'").get();
  if(profile?.major!=='Computer science')process.exit(1);
  const resume=d.prepare("SELECT filename, bytes FROM resume WHERE applicationId='smoke-application'").get();
  if(resume?.filename!=='resume.pdf'||Buffer.from(resume.bytes).toString()!=='%PDF-1.4 container resume %%EOF')process.exit(1);
  const attendance=d.prepare("SELECT dietary,checkedInAt FROM attendance WHERE userId='smoke-user'").get();
  if(attendance?.dietary!=='Vegetarian'||attendance.checkedInAt!==2)process.exit(1);
  if(d.prepare("SELECT version FROM meal_ticket WHERE userId='smoke-user' AND meal='lunch'").get()?.version!==1)process.exit(1);
  if(d.prepare("SELECT value FROM sponsor_code WHERE redeemedBy='smoke-user'").get()?.value!=='SMOKE-CODE')process.exit(1);
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
    `(async()=>{
      const base='http://127.0.0.1:3000';
      const post=(path,body,cookie='')=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://portal.example.test',Cookie:cookie},body:JSON.stringify(body)});
      const signup=await post('/api/auth/sign-up/email',{name:'Email-free Demo',email:'email-free@example.test',password:'Synthetic-password-2026!'});
      if(!signup.ok)throw Error('Email-free registration failed: '+await signup.text());
      const cookie=signup.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
      const verified=await post('/api/demo/verify-email',{},cookie);
      if(!verified.ok || !(await verified.json()).verified)throw Error('Demo verification failed');
      for(const email of ['email-free@example.test','missing@example.test']) {
        const reset=await post('/api/auth/request-password-reset',{email});
        if(reset.status!==400)throw Error('Email-free reset must be disabled');
      }
      if(!(await (await fetch(base+'/forgot-password')).text()).includes('Password reset is unavailable'))throw Error('Missing email-free notice');
    })().catch(e=>{console.error(e);process.exit(1)})`,
  ]);
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
      "INSERT INTO hacker_answer(applicationId,interests,experience,ambition) VALUES('smoke-application','Community software','A test project','Learn together');"+
      "INSERT INTO hacker_profile(applicationId,major) VALUES('smoke-application','Computer science');"+
      "INSERT INTO attendance(eventId,userId,confirmedAt,dietary,checkedInAt,checkerId) VALUES('smoke-event','smoke-user',1,'Vegetarian',2,'smoke-user');"+
      "INSERT INTO meal_ticket(eventId,userId,meal,usedAt,checkerId,version) VALUES('smoke-event','smoke-user','lunch',3,'smoke-user',1);"+
      "INSERT INTO sponsor(id,eventId,name,createdAt) VALUES('smoke-sponsor','smoke-event','Synthetic sponsor',1);"+
      "INSERT INTO sponsor_code(id,sponsorId,value,redeemedBy,redeemedAt,createdAt) VALUES('smoke-code','smoke-sponsor','SMOKE-CODE','smoke-user',3,1); COMMIT;"
    );d.prepare("INSERT INTO resume(applicationId,filename,bytes,updatedAt) VALUES('smoke-application','resume.pdf',?,1)").run(Buffer.from('%PDF-1.4 container resume %%EOF'));d.close()`,
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
    'Container smoke passed: migration, HTTP, application/PDF/attendance/meal/code persistence, migration failure, backup restoration, production mail guard. No external network used.',
  );
} finally {
  run(['rm', '-f', name], true);
  run(['volume', 'rm', volume], true);
}
