import { eq } from 'drizzle-orm';
import { database } from '../src/lib/server/db';
import { user, administrator } from '../src/lib/server/db/schema';
const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error('Usage: pnpm admin:grant existing-account@example.com');
const db = database();
const account = db.select().from(user).where(eq(user.email, email)).get();
if (!account?.emailVerified)
  throw new Error('Register and verify this account before granting administrator access.');
db.insert(administrator).values({ userId: account.id }).onConflictDoNothing().run();
console.log(
  'Platform administrator granted. Event memberships are still required for review and release.',
);
