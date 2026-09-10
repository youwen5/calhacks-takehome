import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { connect } from '../src/lib/server/db/index';
const { db, sqlite } = connect(process.env.DATABASE_PATH || './data/portal.db');
try {
  migrate(db, { migrationsFolder: process.env.MIGRATIONS_DIR || './drizzle' });
} finally {
  sqlite.close();
}
console.log('Database migrations complete.');
