import { demoAccounts, demoPassword } from '../src/lib/demo-accounts';
import { demoAccountsEnabled } from '../src/lib/server/demo';
import { readFileSync } from 'node:fs';
import { demoHackerProfile } from './demo-hacker';
import { demoEvents } from './demo-events';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { database } from '../src/lib/server/db';
import { getAuth } from '../src/lib/server/auth';
import { portal } from '../src/lib/server/portal';
import * as s from '../src/lib/server/db/schema';

if (process.env.NODE_ENV === 'production' && !demoAccountsEnabled())
  throw new Error(
    'Production seeding requires explicit DEMO_ACCOUNTS=true in email-free demo mode.',
  );
const db = database();
migrate(db, { migrationsFolder: process.env.MIGRATIONS_DIR || './drizzle' });
const password = process.env.DEMO_PASSWORD || demoPassword;
const people = demoAccounts;
const users: Record<string, string> = {};
for (const person of people) {
  const existing = db.select().from(s.user).where(eq(s.user.email, person.email)).get();
  if (existing) users[person.email] = existing.id;
  else {
    const result = await getAuth().api.signUpEmail({
      body: { name: person.name, email: person.email, password },
    });
    users[person.email] = result.user.id;
    db.update(s.user).set({ emailVerified: true }).where(eq(s.user.id, result.user.id)).run();
  }
}
const manager = users['manager@example.com'],
  reviewer = users['reviewer@example.com'];
db.insert(s.administrator).values({ userId: manager }).onConflictDoNothing().run();
const p = portal(db);
const now = Date.now(),
  day = 86_400_000;
for (const { slug, name, offset, description, venue } of demoEvents) {
  if (db.select().from(s.event).where(eq(s.event.slug, slug)).get()) continue;
  p.createEvent(
    manager,
    {
      name,
      description,
      venue,
      timezone: 'America/Los_Angeles',
      opensAt: now - day,
      closesAt: now + (offset - 7) * day,
      startsAt: now + offset * day,
      endsAt: now + (offset + 1) * day,
    },
    slug,
    'manager@example.com',
  );
  const e = p.event(slug, manager);
  p.configure(manager, slug, e.version, e, 'published', ['hacker', 'mentor']);
  if (slug === 'cal-hacks-fall') p.changeMember(manager, slug, 'reviewer@example.com', 'reviewer');
}
const answers = {
  name: 'Sam Rivera',
  organization: 'University of California, Berkeley',
  ...demoHackerProfile,
  introduction: 'I’m a curious builder who enjoys turning small observations into useful projects.',
  link: 'https://example.com',
  interests: 'Accessible creative tools and community projects.',
  experience:
    'I built a simple study group finder with classmates and learned how to listen to feedback.',
  ambition: 'Build something with new friends and learn how to make it welcoming.',
};
for (const person of people.slice(2)) {
  if (p.applicant('cal-hacks-fall', users[person.email], 'hacker').application) continue;
  const a = p.saveApplication(
    'cal-hacks-fall',
    users[person.email],
    'hacker',
    0,
    { ...answers, name: person.name },
    true,
    {
      filename: 'demo-resume.pdf',
      bytes: readFileSync(new URL('./fixtures/demo-resume.pdf', import.meta.url)),
    },
  );
  if (person.email !== 'morgan@example.com') {
    const c = p.claim(reviewer, 'cal-hacks-fall', a, 'acquire')!;
    p.saveReview(
      reviewer,
      'cal-hacks-fall',
      a,
      c.token,
      1,
      {
        score1: 4,
        score2: 3,
        score3: 4,
        notes: 'A thoughtful application with a clear interest in learning together.',
      },
      true,
    );
    const d = p.prepareDecision(
      manager,
      'cal-hacks-fall',
      a,
      person.email === 'applicant@example.com' ? 'waitlisted' : 'accepted',
      '',
      0,
    );
    p.publish(manager, 'cal-hacks-fall', p.createRelease(manager, 'cal-hacks-fall', [d]));
  }
}
console.log(
  'Demo ready. Accounts: manager@example.com, reviewer@example.com, applicant@example.com',
);
console.log('Password: DEMO_PASSWORD if supplied, otherwise the documented public demo password.');
