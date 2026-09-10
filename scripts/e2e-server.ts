import { rmSync, mkdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
// A dedicated synthetic database keeps browser tests separate from local demo work.
const directory = './data/e2e';
rmSync(directory, { recursive: true, force: true });
mkdirSync(directory, { recursive: true });
const env = {
  ...process.env,
  NODE_ENV: 'development',
  DATABASE_PATH: `${directory}/portal.db`,
  OUTBOX_DIR: `${directory}/outbox`,
  MAIL_MODE: 'outbox',
  BETTER_AUTH_URL: 'http://localhost:5174',
};
const seed = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed.ts'], {
  env,
  stdio: 'inherit',
});
if (seed.status !== 0) process.exit(seed.status || 1);
const child = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'dev', '--host', '127.0.0.1', '--port', '5174', '--strictPort'],
  { env, stdio: 'inherit' },
);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 0));
