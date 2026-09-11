import { afterEach, describe, expect, it, vi } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { connect } from '../src/lib/server/db';
import { user } from '../src/lib/server/db/schema';
import { demoEmailVerificationEnabled, verifyDemoEmail } from '../src/lib/server/demo';

afterEach(() => vi.unstubAllEnvs());
describe('demo email verification', () => {
  it('defaults on locally, off in production, and honors explicit configuration', () => {
    expect(demoEmailVerificationEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(demoEmailVerificationEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(
      demoEmailVerificationEnabled({ NODE_ENV: 'production', DEMO_EMAIL_VERIFICATION: 'true' }),
    ).toBe(true);
    expect(
      demoEmailVerificationEnabled({ NODE_ENV: 'development', DEMO_EMAIL_VERIFICATION: 'false' }),
    ).toBe(false);
  });
  it('enforces the flag and verifies only the current account and email', () => {
    const c = connect(':memory:');
    try {
      migrate(c.db, { migrationsFolder: './drizzle' });
      for (const id of ['one', 'two'])
        c.db
          .insert(user)
          .values({
            id,
            name: id,
            email: id + '@example.com',
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .run();
      vi.stubEnv('DEMO_EMAIL_VERIFICATION', 'false');
      expect(() => verifyDemoEmail(c.db, { id: 'one', email: 'one@example.com' })).toThrow(
        'disabled',
      );
      vi.stubEnv('DEMO_EMAIL_VERIFICATION', 'true');
      expect(() => verifyDemoEmail(c.db, { id: 'one', email: 'old@example.com' })).toThrow(
        'changed',
      );
      verifyDemoEmail(c.db, { id: 'one', email: 'one@example.com' });
      verifyDemoEmail(c.db, { id: 'one', email: 'one@example.com' });
      expect(c.db.select({ id: user.id, verified: user.emailVerified }).from(user).all()).toEqual([
        { id: 'one', verified: true },
        { id: 'two', verified: false },
      ]);
    } finally {
      c.sqlite.close();
    }
  });
});
