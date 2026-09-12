import { connect } from '../src/lib/server/db';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
if (process.env.NODE_ENV === 'production' || !process.argv.includes('--confirm'))
  throw new Error(
    'Local demo only: pass --confirm to reset applications and their related records.',
  );
const path = process.env.DATABASE_PATH || './data/portal.db';
const { sqlite } = connect(path);
try {
  const backup = join(dirname(path), 'backups', `before-application-reset-${Date.now()}.db`);
  mkdirSync(dirname(backup), { recursive: true });
  await sqlite.backup(backup);
  sqlite
    .transaction(() => {
      // Reverse FK dependency order. Keep global accounts, events, memberships and sponsor inventory.
      for (const table of [
        'meal_ticket',
        'attendance',
        'publication',
        'release_item',
        'release',
        'prepared_decision',
        'decision',
        'claim',
        'review',
        'resume',
        'hacker_profile',
        'hacker_answer',
        'mentor_answer',
        'application',
      ])
        sqlite.exec(`DELETE FROM ${table}`);
      sqlite.exec('UPDATE sponsor_code SET redeemedBy=NULL, redeemedAt=NULL');
      sqlite.exec(
        "DELETE FROM audit WHERE action NOT IN ('event_created','event_configured','event_archived','membership_changed','sponsor_created','sponsor_codes_added','sponsor_code_deleted','sponsor_deleted')",
      );
    })
    .immediate();
  if (sqlite.pragma('foreign_key_check').length)
    throw new Error('Foreign-key check failed after reset.');
  console.log(
    `Demo applications reset. Accounts and event configuration retained. Backup: ${backup}`,
  );
} finally {
  sqlite.close();
}
