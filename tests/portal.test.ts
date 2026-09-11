import { reports, toCsv } from '../src/lib/server/reports';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { connect } from '../src/lib/server/db';
import * as s from '../src/lib/server/db/schema';
import { portal } from '../src/lib/server/portal';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let connection: ReturnType<typeof connect>;
let p: ReturnType<typeof portal>;
let time: number;
const common = {
  name: 'Sam Builder',
  organization: 'Berkeley',
  introduction: 'I love learning with other people.',
  link: 'https://example.com',
};
const hacker = {
  ...common,
  interests: 'Creative computing',
  experience: 'Built a garden sensor',
  ambition: 'Learn from a team',
};
const mentor = {
  ...common,
  expertise: 'Web engineering',
  mentoring: 'Pair programming with students',
  availability: 'Saturday afternoon, Pacific time',
};
const grades = { score1: 3, score2: 4, score3: 5, notes: 'Thoughtful response.' };
function submit(actor = 'applicant', type: 'hacker' | 'mentor' = 'hacker', slug = 'fall') {
  return p.saveApplication(slug, actor, type, 0, type === 'hacker' ? hacker : mentor, true);
}
function complete(applicationId: string, actor = 'reviewer', slug = 'fall') {
  const claim = p.claim(actor, slug, applicationId, 'acquire')!;
  p.saveReview(actor, slug, applicationId, claim.token, 1, grades, true);
}
function prepare(applicationId: string, value = 'accepted', sequence = 0) {
  return p.prepareDecision(
    'manager',
    'fall',
    applicationId,
    value,
    'Suitable applicant for this event',
    sequence,
  );
}
beforeEach(() => {
  time = 2_000_000_000_000;
  connection = connect(':memory:');
  migrate(connection.db, { migrationsFolder: './drizzle' });
  for (const id of ['admin', 'manager', 'manager2', 'reviewer', 'applicant', 'other'])
    connection.db
      .insert(s.user)
      .values({
        id,
        name: id,
        email: `${id}@example.com`,
        emailVerified: true,
        createdAt: new Date(time),
        updatedAt: new Date(time),
      })
      .run();
  connection.db.insert(s.administrator).values({ userId: 'admin' }).run();
  p = portal(connection.db, () => time);
  for (const slug of ['fall', 'spring']) {
    p.createEvent(
      'admin',
      {
        name: `${slug} event`,
        description: 'A hypothetical test event.',
        venue: 'Berkeley',
        timezone: 'America/Los_Angeles',
        opensAt: time - 1000,
        closesAt: time + 10_000_000,
        startsAt: time + 20_000_000,
        endsAt: time + 30_000_000,
      },
      slug,
      'manager@example.com',
    );
    const e = p.event(slug, 'manager');
    p.configure('manager', slug, e.version, e, 'published', ['hacker', 'mentor']);
  }
  p.changeMember('manager', 'fall', 'reviewer@example.com', 'reviewer');
  p.changeMember('admin', 'fall', 'manager2@example.com', 'manager');
});
afterEach(() => connection.sqlite.close());

describe('applications and event isolation', () => {
  it('shows unpublished events only to their assigned team or platform administrators', () => {
    const e = p.event('fall');
    p.createEvent(
      'admin',
      { ...e, name: 'Private planning event' },
      'private',
      'manager2@example.com',
    );
    expect(p.events('manager2').some((e) => e.slug === 'private')).toBe(true);
    expect(p.events('applicant').some((e) => e.slug === 'private')).toBe(false);
    expect(p.events().some((e) => e.slug === 'private')).toBe(false);
    expect(() => p.event('private', 'reviewer')).toThrow('not found');
  });
  it('keeps both types and repeated events independent', () => {
    const ids = [submit(), submit('applicant', 'mentor'), submit('applicant', 'hacker', 'spring')];
    expect(new Set(ids).size).toBe(3);
    expect(p.applicant('fall', 'applicant', 'mentor').application?.answers).toMatchObject({
      expertise: mentor.expertise,
    });
    expect(p.applicant('spring', 'applicant', 'hacker').application?.status).toBe('submitted');
    expect(() => p.reviewDetail('reviewer', 'spring', ids[2])).toThrow('permission');
    expect(() => p.reviewDetail('reviewer', 'fall', ids[2])).toThrow('not found');
  });
  it('preserves drafts, rejects stale creation/save/submission, and locks submission', () => {
    p.saveApplication('fall', 'applicant', 'hacker', 0, { ...hacker, ambition: '' }, false);
    expect(p.applicant('fall', 'applicant', 'hacker').application?.status).toBe('draft');
    expect(() => submit()).toThrow('another tab');
    expect(() =>
      p.saveApplication('fall', 'applicant', 'hacker', 1, { ...hacker, ambition: '' }, true),
    ).toThrow('ambition');
    p.saveApplication('fall', 'applicant', 'hacker', 1, hacker, true);
    expect(() => p.saveApplication('fall', 'applicant', 'hacker', 2, hacker, false)).toThrow(
      'another tab',
    );
  });
  it('does not expose draft answers to organizers and never includes private decision fields', () => {
    const a = p.saveApplication('fall', 'applicant', 'hacker', 0, hacker, false);
    expect(p.queue('manager', 'fall').rows[0].submission).toBe('draft');
    expect(() => p.reviewDetail('manager', 'fall', a)).toThrow('private');
    p.saveApplication('fall', 'applicant', 'hacker', 1, hacker, true);
    complete(a);
    prepare(a);
    const response = JSON.stringify(p.applicant('fall', 'applicant', 'hacker'));
    expect(response).not.toContain('accepted');
    expect(response).not.toContain('Thoughtful response');
    expect(response).not.toContain('reviewVersion');
  });
  it('enforces type-specific answers, verification, and safe URLs', () => {
    expect(() => p.saveApplication('fall', 'applicant', 'mentor', 0, hacker, true)).toThrow();
    expect(() =>
      p.saveApplication(
        'fall',
        'applicant',
        'hacker',
        0,
        { ...hacker, link: 'javascript:alert(1)' },
        true,
      ),
    ).toThrow();
    connection.db
      .update(s.user)
      .set({ emailVerified: false })
      .where(eq(s.user.id, 'applicant'))
      .run();
    expect(() => submit()).toThrow('Verify');
    expect(() => p.saveApplication('fall', 'applicant', 'hacker', 0, hacker, false)).not.toThrow();
  });
  it('uses server time and archived lifecycle for writes', () => {
    const e = p.event('fall');
    time = e.closesAt;
    expect(() => submit()).toThrow('window');
    time = e.opensAt - 1;
    expect(() => submit()).toThrow('window');
    expect(() => p.saveApplication('fall', 'applicant', 'hacker', 0, hacker, false)).not.toThrow();
    p.configure('manager', 'fall', e.version, e, 'archived', ['hacker', 'mentor']);
    expect(() => p.saveApplication('fall', 'applicant', 'hacker', 1, hacker, false)).toThrow(
      'not open',
    );
    expect(() => p.changeMember('manager', 'fall', 'reviewer@example.com', 'remove')).not.toThrow();
  });
  it('checks the deadline after waiting for an actual SQLite write lock', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'calhacks-lock-'));
    const filename = join(directory, 'portal.db');
    await connection.sqlite.backup(filename);
    const local = connect(filename);
    const started = Date.now();
    const clock = () => time + Date.now() - started;
    const localPortal = portal(local.db, clock);
    const e = localPortal.event('fall');
    localPortal.configure(
      'manager',
      'fall',
      e.version,
      { ...e, closesAt: time + 150 },
      'published',
      ['hacker', 'mentor'],
    );
    // A separate process is necessary: POSIX locks are process-scoped, so two
    // independently linked SQLite drivers in worker threads do not model contention.
    const worker = spawn(
      process.execPath,
      [
        '-e',
        `const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.argv[1]);d.exec('BEGIN IMMEDIATE');process.send('locked');setTimeout(()=>{d.exec('COMMIT');d.close();process.disconnect()},300)`,
        filename,
      ],
      { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        worker.once('message', () => resolve());
        worker.once('error', reject);
        worker.once('exit', (code) => {
          if (code) reject(new Error('Lock holder failed'));
        });
      });
      expect(() =>
        localPortal.saveApplication('fall', 'applicant', 'hacker', 0, hacker, true),
      ).toThrow('window');
      expect(localPortal.applicant('fall', 'applicant', 'hacker').application).toBeNull();
    } finally {
      worker.kill();
      local.sqlite.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it('does not let event managers escalate roles or remove the final manager', () => {
    expect(() => p.changeMember('manager', 'fall', 'reviewer@example.com', 'manager')).toThrow(
      'administrators',
    );
    expect(() => p.changeMember('admin', 'spring', 'manager@example.com', 'remove')).toThrow(
      'at least one',
    );
  });
  it('retains type availability and form versions once applications exist', () => {
    submit();
    const e = p.event('fall');
    expect(() => p.configure('manager', 'fall', e.version, e, 'published', ['mentor'])).toThrow(
      'Cannot remove',
    );
    expect(p.applicant('fall', 'applicant', 'hacker').formVersion).toBe(1);
  });
});

describe('review claims', () => {
  it('serializes competing draft creation and claim acquisition across processes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'calhacks-race-'));
    const filename = join(directory, 'portal.db');
    await connection.sqlite.backup(filename);
    const local = connect(filename);
    const localPortal = portal(local.db, () => time);
    async function race(operations: string[]) {
      const workers = operations.map((operation) =>
        spawn(
          process.execPath,
          [
            '--import',
            'tsx',
            '--input-type=module',
            '-e',
            `import {connect} from './src/lib/server/db/index.ts';
         import {portal} from './src/lib/server/portal.ts';
         const c=connect(process.argv[1]); const p=portal(c.db,()=>${time});
         process.once('message',()=>{try {const value=${operation}; process.send({ok:true,value});}
         catch(e){process.send({ok:false,message:e.message});} finally {c.sqlite.close();process.disconnect();}});
         process.send('ready');`,
            filename,
          ],
          { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] },
        ),
      );
      try {
        await Promise.all(
          workers.map(
            (worker) =>
              new Promise<void>((resolve, reject) => {
                worker.once('message', () => resolve());
                worker.once('error', reject);
                worker.once('exit', () => reject(new Error('Race worker exited before readiness')));
              }),
          ),
        );
        // Queue both independent writers behind a real held lock before letting
        // either commit; sequential calls cannot establish this invariant.
        local.sqlite.exec('BEGIN IMMEDIATE');
        const outcomes = workers.map(
          (worker) =>
            new Promise<{ ok: boolean; value?: unknown; message?: string }>((resolve, reject) => {
              worker.once('message', (result) => resolve(result as { ok: boolean }));
              worker.once('error', reject);
              worker.once('exit', () => reject(new Error('Race worker exited without result')));
              worker.send('go');
            }),
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        local.sqlite.exec('COMMIT');
        return await Promise.all(outcomes);
      } finally {
        if (local.sqlite.inTransaction) local.sqlite.exec('ROLLBACK');
        for (const worker of workers) worker.kill();
      }
    }
    try {
      const drafts = await race(
        [hacker, { ...hacker, organization: 'Other tab' }].map(
          (answers) =>
            `p.saveApplication('fall','applicant','hacker',0,${JSON.stringify(answers)},false)`,
        ),
      );
      expect(drafts.filter((r) => r.ok)).toHaveLength(1);
      expect(drafts.filter((r) => !r.ok)).toHaveLength(1);
      const draft = localPortal.applicant('fall', 'applicant', 'hacker').application!;
      const applicationId = localPortal.saveApplication(
        'fall',
        'applicant',
        'hacker',
        draft.version,
        hacker,
        true,
      );
      const claims = await race(
        ['reviewer', 'manager'].map(
          (actor) => `p.claim('${actor}','fall','${applicationId}','acquire')`,
        ),
      );
      expect(claims.filter((r) => r.ok)).toHaveLength(1);
      expect(claims.find((r) => !r.ok)?.message).toContain('already claimed');
    } finally {
      local.sqlite.close();
      rmSync(directory, { recursive: true, force: true });
    }
  }, 15000);
  it('blocks double claims, stale versions and stale tokens after reacquisition', () => {
    const a = submit();
    const c = p.claim('reviewer', 'fall', a, 'acquire')!;
    expect(() => p.claim('manager', 'fall', a, 'acquire')).toThrow('already claimed');
    p.saveReview('reviewer', 'fall', a, c.token, 1, grades, false);
    expect(() => p.saveReview('reviewer', 'fall', a, c.token, 1, grades, false)).toThrow('changed');
    time += 20 * 60_000;
    const next = p.claim('reviewer', 'fall', a, 'acquire')!;
    expect(next.token).not.toBe(c.token);
    expect(() => p.saveReview('reviewer', 'fall', a, c.token, 2, grades, false)).toThrow('Claim');
  });
  it('revocation invalidates claims even when membership is later restored', () => {
    const a = submit();
    const c = p.claim('reviewer', 'fall', a, 'acquire')!;
    p.changeMember('manager', 'fall', 'reviewer@example.com', 'remove');
    expect(() => p.saveReview('reviewer', 'fall', a, c.token, 1, grades, true)).toThrow(
      'permission',
    );
    p.changeMember('manager', 'fall', 'reviewer@example.com', 'reviewer');
    expect(() => p.saveReview('reviewer', 'fall', a, c.token, 1, grades, true)).toThrow('Claim');
  });
  it('enforces complete bounded grades and immutable completed reviews', () => {
    const a = submit();
    const c = p.claim('reviewer', 'fall', a, 'acquire')!;
    expect(() =>
      p.saveReview('reviewer', 'fall', a, c.token, 1, { ...grades, score1: null }, true),
    ).toThrow('every criterion');
    expect(() =>
      p.saveReview('reviewer', 'fall', a, c.token, 1, { ...grades, score1: 6 }, true),
    ).toThrow();
    p.saveReview('reviewer', 'fall', a, c.token, 1, grades, true);
    for (const field of ['score1', 'score2', 'score3']) {
      expect(() =>
        connection.db
          .update(s.review)
          .set({ [field]: 3.5 })
          .where(eq(s.review.applicationId, a))
          .run(),
      ).toThrow();
    }
    expect(() => p.claim('reviewer', 'fall', a, 'acquire')).toThrow('complete');
    expect(() =>
      connection.db.update(s.review).set({ score1: 7 }).where(eq(s.review.applicationId, a)).run(),
    ).toThrow();
  });
});

describe('decision publication', () => {
  it('keeps waitlists visible until a separately released promotion', () => {
    const a = submit();
    complete(a);
    const revision = prepare(a, 'waitlisted');
    expect(p.applicant('fall', 'applicant', 'hacker').application?.status).toBe('submitted');
    const batch = p.createRelease('manager', 'fall', [revision]);
    const stamp = p.publish('manager', 'fall', batch);
    expect(p.publish('manager', 'fall', batch)).toBe(stamp);
    expect(p.applicant('fall', 'applicant', 'hacker').application?.status).toBe('waitlisted');
    const promotion = prepare(a, 'accepted', 1);
    expect(p.applicant('fall', 'applicant', 'hacker').application?.status).toBe('waitlisted');
    p.cancelDecision('manager', 'fall', a, promotion);
    expect(p.applicant('fall', 'applicant', 'hacker').application?.status).toBe('waitlisted');
    const next = prepare(a, 'accepted', 2);
    p.publish('manager', 'fall', p.createRelease('manager', 'fall', [next]));
    expect(p.applicant('fall', 'applicant', 'hacker').application?.status).toBe('accepted');
    expect(p.reviewDetail('manager', 'fall', a).history).toHaveLength(3);
  });
  it('rejects an entire stale batch, not just its stale item', () => {
    const a = submit(),
      b = submit('other');
    complete(a);
    complete(b);
    const da = prepare(a),
      db = prepare(b);
    const batch = p.createRelease('manager', 'fall', [da, db]);
    prepare(b, 'waitlisted', 1);
    expect(() => p.publish('manager', 'fall', batch)).toThrow('stale');
    expect(connection.db.select().from(s.publication).all()).toHaveLength(0);
    expect(p.applicant('fall', 'applicant', 'hacker').application?.status).toBe('submitted');
  });
  it('overlapping releases cannot both publish; retry after commit is idempotent', () => {
    const a = submit();
    complete(a);
    const d = prepare(a);
    const first = p.createRelease('manager', 'fall', [d]),
      second = p.createRelease('manager2', 'fall', [d]);
    const stamp = p.publish('manager', 'fall', first);
    time++;
    expect(() => p.publish('manager2', 'fall', second)).toThrow('stale');
    expect(p.publish('manager', 'fall', first)).toBe(stamp);
    expect(connection.db.select().from(s.publication).all()).toHaveLength(1);
  });
  it('blocks self-review and self-publication, including mixed types and batches', () => {
    const a = submit('manager', 'mentor'),
      b = submit();
    complete(a);
    complete(b);
    expect(() => p.reviewDetail('manager', 'fall', a)).toThrow('not found');
    expect(() => prepare(a)).toThrow('not found');
    const da = p.prepareDecision('manager2', 'fall', a, 'accepted', '', 0),
      db = prepare(b);
    const batch = p.createRelease('manager2', 'fall', [da, db]);
    expect(() => p.publish('manager', 'fall', batch)).toThrow('not found');
    expect(() => p.releaseDetail('manager', 'fall', batch)).toThrow('Another manager');
    expect(connection.db.select().from(s.publication).all()).toHaveLength(0);
    expect(() => p.publish('manager2', 'fall', batch)).not.toThrow();
  });
  it('requires a completed review, manager membership, and a published event', () => {
    const a = submit();
    expect(() => prepare(a)).toThrow('Complete');
    complete(a);
    expect(() => p.prepareDecision('reviewer', 'fall', a, 'accepted', '', 0)).toThrow('permission');
    const d = prepare(a);
    const batch = p.createRelease('manager', 'fall', [d]);
    const e = p.event('fall');
    p.configure('manager', 'fall', e.version, e, 'archived', ['hacker', 'mentor']);
    expect(() => p.publish('manager', 'fall', batch)).toThrow('not open');
    expect(() => p.publish('admin', 'fall', batch)).toThrow('permission');
  });
});

describe('event schedule', () => {
  it('persists event-specific milestones, rejects invalid order and unauthorized edits', () => {
    const e = p.event('fall');
    const schedule = {
      decisionsAt: e.closesAt + 1000,
      checkInAt: e.startsAt + 1000,
      openingCeremonyAt: e.startsAt + 2000,
    };
    expect(() =>
      p.configure('reviewer', 'fall', e.version, { ...e, ...schedule }, 'published', [
        'hacker',
        'mentor',
      ]),
    ).toThrow('permission');
    for (const invalid of [
      { decisionsAt: e.closesAt - 1 },
      { checkInAt: e.startsAt - 1 },
      { openingCeremonyAt: e.endsAt },
      { openingCeremonyAt: schedule.checkInAt - 1 },
    ]) {
      expect(() =>
        p.configure('manager', 'fall', e.version, { ...e, ...schedule, ...invalid }, 'published', [
          'hacker',
          'mentor',
        ]),
      ).toThrow('Schedule');
    }
    p.configure('manager', 'fall', e.version, { ...e, ...schedule }, 'published', [
      'hacker',
      'mentor',
    ]);
    expect(p.event('fall')).toMatchObject(schedule);
    expect(p.event('spring').decisionsAt).toBeNull();
    const changed = p.event('fall');
    p.configure(
      'manager',
      'fall',
      changed.version,
      { ...changed, decisionsAt: null },
      'published',
      ['hacker', 'mentor'],
    );
    expect(p.event('fall').decisionsAt).toBeNull();
  });
  it('does not publish prepared decisions when the scheduled date passes', () => {
    const a = submit();
    complete(a);
    prepare(a);
    time = p.event('fall').startsAt;
    expect(p.applicant('fall', 'applicant', 'hacker').application).toMatchObject({
      status: 'submitted',
      publishedAt: null,
    });
  });
});

describe('resume PDFs', () => {
  const file = { filename: 'resume.pdf', bytes: Buffer.from('%PDF-1.4\nTest resume\n%%EOF') };
  it('keeps draft files private, freezes the submitted file, and scopes access to an event', () => {
    const a = p.saveApplication('fall', 'applicant', 'hacker', 0, hacker, false, file);
    expect(p.resume('applicant', 'fall', a).bytes).toEqual(file.bytes);
    expect(() => p.resume('reviewer', 'fall', a)).toThrow('private');
    expect(() => p.resume('other', 'fall', a)).toThrow('permission');
    expect(() => p.resume('applicant', 'spring', a)).toThrow('not found');
    expect(JSON.stringify(p.applicant('fall', 'applicant', 'hacker'))).not.toContain('Test resume');
    p.saveApplication('fall', 'applicant', 'hacker', 1, hacker, true);
    expect(p.resume('reviewer', 'fall', a).bytes).toEqual(file.bytes);
    expect(p.reviewDetail('reviewer', 'fall', a).resume?.filename).toBe('resume.pdf');
    expect(() => p.saveApplication('fall', 'applicant', 'hacker', 2, hacker, false, null)).toThrow(
      'another tab',
    );
    p.changeMember('manager', 'fall', 'reviewer@example.com', 'remove');
    expect(() => p.resume('reviewer', 'fall', a)).toThrow('permission');
  });
  it('validates uploads atomically and supports replacement and removal', () => {
    expect(() =>
      p.saveApplication('fall', 'applicant', 'hacker', 0, hacker, false, {
        filename: 'fake.pdf',
        bytes: Buffer.from('not a pdf'),
      }),
    ).toThrow('PDF');
    expect(p.applicant('fall', 'applicant', 'hacker').application).toBeNull();
    expect(() =>
      p.saveApplication('fall', 'applicant', 'hacker', 0, hacker, false, {
        filename: 'large.pdf',
        bytes: Buffer.alloc(2 * 1024 * 1024 + 1),
      }),
    ).toThrow('2 MB');
    const a = p.saveApplication('fall', 'applicant', 'hacker', 0, hacker, false, file);
    p.saveApplication('fall', 'applicant', 'hacker', 1, hacker, false, {
      ...file,
      filename: 'updated.pdf',
    });
    expect(() => p.saveApplication('fall', 'applicant', 'hacker', 1, hacker, false, null)).toThrow(
      'another tab',
    );
    expect(p.resume('applicant', 'fall', a).filename).toBe('updated.pdf');
    p.saveApplication('fall', 'applicant', 'hacker', 2, hacker, false, null);
    expect(() => p.resume('applicant', 'fall', a)).toThrow('No resume');
  });
});

describe('organizer reports', () => {
  it('counts only the latest published revision and keeps prepared decisions private', () => {
    const r = reports(connection.db, () => time);
    const a = submit();
    complete(a);
    const waitlist = prepare(a, 'waitlisted');
    expect(r.analytics('reviewer', 'fall').statuses).toEqual([{ label: 'submitted', count: 1 }]);
    p.publish('manager', 'fall', p.createRelease('manager', 'fall', [waitlist]));
    const promotion = prepare(a, 'accepted', 1);
    expect(r.warehouse('manager', 'fall').accepted).toBe(0);
    p.publish('manager', 'fall', p.createRelease('manager', 'fall', [promotion]));
    expect(r.analytics('reviewer', 'fall')).toMatchObject({
      total: 1,
      reviewed: 1,
      statuses: [{ label: 'accepted', count: 1 }],
    });
    expect(r.leaderboard('reviewer', 'fall', 'all')).toMatchObject([
      { total: 1, accepted: 1, waitlisted: 0 },
    ]);
    expect(r.export('manager', 'fall', 'accepted')).toHaveLength(1);
    expect(r.analytics('reviewer', 'fall', 'mentor').total).toBe(0);
    time += 8 * 86_400_000;
    expect(r.leaderboard('reviewer', 'fall', 'week')).toHaveLength(0);
  });
  it('checks event membership and manager-only export access, excludes private draft answers', () => {
    const r = reports(connection.db, () => time);
    p.saveApplication(
      'fall',
      'applicant',
      'hacker',
      0,
      { ...hacker, organization: 'PRIVATE DRAFT' },
      false,
    );
    submit('other', 'mentor');
    expect(() => r.analytics('applicant', 'fall')).toThrow('access');
    expect(() => r.analytics('reviewer', 'spring')).toThrow('access');
    expect(() => r.export('reviewer', 'fall', 'participants')).toThrow('access');
    expect(() => r.export('admin', 'fall', 'applications')).toThrow('access');
    expect(r.warehouse('manager', 'fall')).toEqual({
      participants: 2,
      applications: 1,
      accepted: 0,
    });
    expect(JSON.stringify(r.analytics('reviewer', 'fall'))).not.toContain('PRIVATE DRAFT');
    const records = r.export('manager', 'fall', 'applications');
    expect(records).toHaveLength(1);
    expect(JSON.stringify(records)).not.toContain('PRIVATE DRAFT');
    expect(r.export('manager', 'spring', 'participants')).toHaveLength(0);
    expect(r.export('manager', 'fall', 'participants')[0]).not.toHaveProperty('password');
    p.changeMember('manager', 'fall', 'reviewer@example.com', 'remove');
    expect(() => r.leaderboard('reviewer', 'fall', 'all')).toThrow('access');
    expect(toCsv([{ name: '=HYPERLINK("bad")', notes: 'a,b\n"quoted"' }])).toContain("'=HYPERLINK");
    expect(toCsv([{ name: ' \t+1' }])).toContain("' \t+1");
  });
  it('uses the event timezone for today and excludes incomplete reviews', () => {
    time = Date.parse('2033-05-18T06:55:00Z');
    // The fixture window is unrelated to this date; only completion times change.
    const e = p.event('fall');
    time = e.opensAt + 100;
    const a = submit();
    complete(a);
    const r = reports(connection.db, () => time);
    expect(r.leaderboard('reviewer', 'fall', 'today')).toHaveLength(1);
    const b = submit('other');
    p.claim('reviewer', 'fall', b, 'acquire');
    expect(r.leaderboard('reviewer', 'fall', 'all')[0].total).toBe(1);
    connection.db
      .update(s.review)
      .set({ completedAt: Date.parse('2033-05-18T06:55:00Z') })
      .where(eq(s.review.applicationId, a))
      .run();
    time = Date.parse('2033-05-18T07:05:00Z');
    expect(r.leaderboard('reviewer', 'fall', 'today')).toHaveLength(0);
  });
});
