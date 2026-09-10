import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { database } from './db';
import * as schema from './db/schema';
import { mailConfig, sendAuthEmail } from './mail';

function secret() {
  if (process.env.BETTER_AUTH_SECRET) {
    if (process.env.BETTER_AUTH_SECRET.length < 32)
      throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters.');
    return process.env.BETTER_AUTH_SECRET;
  }
  if (process.env.NODE_ENV === 'production')
    throw new Error('Set BETTER_AUTH_SECRET before starting production.');
  mkdirSync('data', { recursive: true, mode: 0o700 });
  try {
    return readFileSync('data/auth-secret', 'utf8');
  } catch {
    const value = randomBytes(48).toString('base64');
    writeFileSync('data/auth-secret', value, { mode: 0o600 });
    return value;
  }
}
function createAuth() {
  mailConfig();
  const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:5173';
  if (process.env.NODE_ENV === 'production' && !baseURL.startsWith('https://'))
    throw new Error('Production BETTER_AUTH_URL must be your public HTTPS origin.');
  return betterAuth({
    appName: 'Cal Hacks Portal',
    baseURL,
    secret: secret(),
    database: drizzleAdapter(database(), { provider: 'sqlite', schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail(user.email, url, 'reset');
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail(user.email, url, 'verify');
      },
    },
    rateLimit: { enabled: true, window: 60, max: 30 },
    trustedOrigins: [new URL(baseURL).origin],
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export const getAuth = () => (instance ??= createAuth());
