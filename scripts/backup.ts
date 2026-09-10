import { connect } from '../src/lib/server/db';
import { existsSync } from 'node:fs';
const destination = process.argv[2];
if (!destination || existsSync(destination))
  throw new Error('Supply a new backup filename; existing files are never overwritten.');
const { sqlite } = connect(process.env.DATABASE_PATH || './data/portal.db');
try {
  await sqlite.backup(destination);
} finally {
  sqlite.close();
}
console.log('SQLite backup complete.');
