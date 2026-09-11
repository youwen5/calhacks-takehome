import { and, eq } from 'drizzle-orm';
import type { PortalDatabase } from './db';
import { user } from './db/schema';
import { PortalError } from './errors';

export function demoEmailVerificationEnabled(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.DEMO_EMAIL_VERIFICATION === 'true' ||
    (env.DEMO_EMAIL_VERIFICATION === undefined && env.NODE_ENV !== 'production')
  );
}

// This deliberately marks the demo account verified without proving mailbox ownership.
// Callers must derive the account from the authenticated session, never request input.
export function verifyDemoEmail(db: PortalDatabase, actor: { id: string; email: string }) {
  if (!demoEmailVerificationEnabled()) throw new PortalError(404, 'Demo verification is disabled.');
  const result = db
    .update(user)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(and(eq(user.id, actor.id), eq(user.email, actor.email)))
    .run();
  if (!result.changes) throw new PortalError(409, 'Your account changed. Sign in again.');
}
