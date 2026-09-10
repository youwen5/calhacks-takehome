import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
const mail = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('../src/lib/server/mail', () => ({
  mailConfig: () => ({ mode: 'outbox' }),
  sendAuthEmail: mail.send,
}));
import { database } from '../src/lib/server/db';
import { getAuth } from '../src/lib/server/auth';
import { user } from '../src/lib/server/db/schema';
const directory = mkdtempSync(join(tmpdir(), 'calhacks-auth-'));
beforeAll(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('DATABASE_PATH', join(directory, 'auth.db'));
  vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:5173');
  vi.stubEnv('BETTER_AUTH_SECRET', 'synthetic-test-secret-with-at-least-thirty-two-characters');
  migrate(database(), { migrationsFolder: './drizzle' });
});
afterAll(() => {
  database().$client.close();
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});
it('keeps an account recoverable after verification delivery failure', async () => {
  mail.send.mockRejectedValueOnce(new Error('Synthetic delivery failure'));
  const auth = getAuth();
  const result = await auth.api.signUpEmail({
    body: {
      name: 'Delivery Test',
      email: 'delivery@example.com',
      password: 'Synthetic-password-long!',
    },
  });
  // Better Auth logs failed signup delivery and keeps the new account usable.
  expect(result.user.emailVerified).toBe(false);
  const account = database()
    .select()
    .from(user)
    .where(eq(user.email, 'delivery@example.com'))
    .get();
  expect(account?.emailVerified).toBe(false);
  const login = await auth.api.signInEmail({
    body: { email: 'delivery@example.com', password: 'Synthetic-password-long!' },
  });
  expect(login.user.id).toBe(account?.id);
  mail.send.mockResolvedValueOnce(undefined);
  await auth.api.sendVerificationEmail({
    body: { email: 'delivery@example.com', callbackURL: '/events' },
  });
  expect(mail.send).toHaveBeenCalledTimes(2);
});
it('keeps reset responses generic for unknown accounts', async () => {
  mail.send.mockResolvedValue(undefined);
  const auth = getAuth();
  const unknown = await auth.api.requestPasswordReset({
    body: { email: 'unknown@example.com', redirectTo: '/reset-password' },
  });
  const known = await auth.api.requestPasswordReset({
    body: { email: 'delivery@example.com', redirectTo: '/reset-password' },
  });
  expect(unknown).toEqual(known);
});
