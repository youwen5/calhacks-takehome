import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';

// Exercise the checked-in Compose file in an isolated project, never the live volume.
const engine = process.env.CONTAINER_ENGINE || 'podman';
const project = `colmena-test-${process.pid}-${Date.now()}`;
const listener = createServer();
await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const env = {
  ...process.env,
  BETTER_AUTH_SECRET: randomBytes(48).toString('hex'),
  BETTER_AUTH_URL: 'https://portal.example.test',
  PORTAL_IMAGE: process.env.SMOKE_IMAGE || 'localhost/calhacks-portal:local',
  PORTAL_PORT: String(port),
};
function run(args, optional = false) {
  const result = spawnSync(engine, args, { env, encoding: 'utf8' });
  if (result.status !== 0 && !optional) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
const compose = (args, optional = false) =>
  run(['compose', '--env-file', 'deploy/production.env.example', '-p', project, ...args], optional);
async function ready() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/events`)).ok) return;
    } catch {
      /* Startup has not bound the port yet. */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Compose did not become ready: ' + compose(['logs', '--tail=30', 'portal']));
}
try {
  compose(['up', '-d']);
  await ready();
  let id = compose(['ps', '-q', 'portal']);
  run([
    'exec',
    id,
    'node',
    '-e',
    "if(process.env.MAIL_MODE!=='disabled'||process.env.AWS_ACCESS_KEY_ID)process.exit(1);require('node:fs').writeFileSync('/data/compose-test','persistent')",
  ]);
  if (engine === 'podman') run(['healthcheck', 'run', id]);
  compose(['stop', 'portal']);
  compose(['up', '-d', '--force-recreate', 'portal']);
  await ready();
  id = compose(['ps', '-q', 'portal']);
  run([
    'exec',
    id,
    'node',
    '-e',
    "if(require('node:fs').readFileSync('/data/compose-test','utf8')!=='persistent')process.exit(1)",
  ]);
  console.log(
    'Compose smoke passed: loopback HTTP, email-disabled configuration, named-volume persistence and container replacement.',
  );
} finally {
  compose(['down', '-v'], true);
}
