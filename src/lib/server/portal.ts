import { and, eq, ne, desc, asc, sql, like, or, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { PortalDatabase } from './db';
import * as s from './db/schema';
import { typeSchema, parseAnswers, decisionSchema, type ApplicationType } from '../domain/forms';

type QueryDb = Pick<PortalDatabase, 'select' | 'insert' | 'update' | 'delete'>;
export class PortalError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function requireThat(condition: unknown, status: number, message: string): asserts condition {
  if (!condition) throw new PortalError(status, message);
}
const id = () => crypto.randomUUID();
const integer = z.coerce.number().int().min(0);
const eventInput = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().min(10).max(3000),
    venue: z.string().trim().min(2).max(200),
    timezone: z.string().refine((v) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, 'Use an IANA timezone'),
    opensAt: z.number().int(),
    closesAt: z.number().int(),
    startsAt: z.number().int(),
    endsAt: z.number().int(),
  })
  .refine(
    (v) => v.opensAt < v.closesAt && v.closesAt <= v.startsAt && v.startsAt < v.endsAt,
    'Dates must be ordered: opening, closing, event start, event end',
  );

export function portal(db: PortalDatabase, now: () => number = Date.now) {
  const atomic = <T>(fn: (tx: QueryDb) => T) => db.transaction(fn, { behavior: 'immediate' });
  const getEvent = (q: QueryDb, slug: string) => {
    const e = q.select().from(s.event).where(eq(s.event.slug, slug)).get();
    requireThat(e, 404, 'Event not found.');
    return e;
  };
  const member = (q: QueryDb, actor: string, eventId: string, manager = false) => {
    const m = q
      .select()
      .from(s.membership)
      .where(and(eq(s.membership.eventId, eventId), eq(s.membership.userId, actor)))
      .get();
    requireThat(
      m && (!manager || m.role === 'manager'),
      403,
      'You do not have permission for this event.',
    );
    return m;
  };
  const admin = (q: QueryDb, actor: string) =>
    requireThat(
      q.select().from(s.administrator).where(eq(s.administrator.userId, actor)).get(),
      403,
      'Platform administrator access required.',
    );
  const active = (e: typeof s.event.$inferSelect) =>
    requireThat(e.status === 'published', 409, 'This event is not open for this action.');
  const visible = (q: QueryDb, e: typeof s.event.$inferSelect, actor?: string) => {
    if (e.status === 'draft')
      requireThat(
        actor &&
          (q
            .select()
            .from(s.membership)
            .where(and(eq(s.membership.eventId, e.id), eq(s.membership.userId, actor)))
            .get() ||
            q.select().from(s.administrator).where(eq(s.administrator.userId, actor)).get()),
        404,
        'Event not found.',
      );
  };
  const applicationFor = (
    q: QueryDb,
    actor: string,
    eventId: string,
    applicationId: string,
    manager = false,
  ) => {
    member(q, actor, eventId, manager);
    const a = q
      .select()
      .from(s.application)
      .where(
        and(
          eq(s.application.id, applicationId),
          eq(s.application.eventId, eventId),
          ne(s.application.userId, actor),
        ),
      )
      .get();
    requireThat(a, 404, 'Application not found.');
    return a;
  };
  const log = (q: QueryDb, actorId: string, eventId: string, action: string, details: unknown) =>
    q
      .insert(s.audit)
      .values({
        id: id(),
        actorId,
        eventId,
        action,
        details: JSON.stringify(details),
        createdAt: now(),
      })
      .run();
  const published = (q: QueryDb, applicationId: string) =>
    q
      .select({
        id: s.decision.id,
        sequence: s.decision.sequence,
        value: s.decision.value,
        publishedAt: s.release.publishedAt,
      })
      .from(s.decision)
      .innerJoin(s.publication, eq(s.publication.revisionId, s.decision.id))
      .innerJoin(s.release, eq(s.release.id, s.publication.releaseId))
      .where(eq(s.decision.applicationId, applicationId))
      .orderBy(desc(s.decision.sequence))
      .get();
  const answers = (q: QueryDb, a: typeof s.application.$inferSelect) =>
    a.type === 'hacker'
      ? q
          .select({
            interests: s.hackerAnswer.interests,
            experience: s.hackerAnswer.experience,
            ambition: s.hackerAnswer.ambition,
          })
          .from(s.hackerAnswer)
          .where(eq(s.hackerAnswer.applicationId, a.id))
          .get()
      : q
          .select({
            expertise: s.mentorAnswer.expertise,
            mentoring: s.mentorAnswer.mentoring,
            availability: s.mentorAnswer.availability,
          })
          .from(s.mentorAnswer)
          .where(eq(s.mentorAnswer.applicationId, a.id))
          .get();

  return {
    identity(actor: string) {
      return {
        administrator: !!db
          .select()
          .from(s.administrator)
          .where(eq(s.administrator.userId, actor))
          .get(),
        memberships: db
          .select({
            eventId: s.event.id,
            slug: s.event.slug,
            name: s.event.name,
            role: s.membership.role,
          })
          .from(s.membership)
          .innerJoin(s.event, eq(s.event.id, s.membership.eventId))
          .where(eq(s.membership.userId, actor))
          .all(),
      };
    },
    events(actor?: string) {
      const isAdmin =
        actor && db.select().from(s.administrator).where(eq(s.administrator.userId, actor)).get();
      return db
        .select()
        .from(s.event)
        .where(
          isAdmin
            ? undefined
            : actor
              ? or(
                  ne(s.event.status, 'draft'),
                  inArray(
                    s.event.id,
                    db
                      .select({ eventId: s.membership.eventId })
                      .from(s.membership)
                      .where(eq(s.membership.userId, actor)),
                  ),
                )
              : ne(s.event.status, 'draft'),
        )
        .orderBy(asc(s.event.startsAt))
        .all();
    },
    event(slug: string, actor?: string) {
      const e = getEvent(db, slug);
      visible(db, e, actor);
      return {
        ...e,
        types: db.select().from(s.offeredType).where(eq(s.offeredType.eventId, e.id)).all(),
      };
    },
    applicant(slug: string, actor: string, rawType: string) {
      const e = getEvent(db, slug);
      visible(db, e, actor);
      const type = typeSchema.parse(rawType);
      const offered = db
        .select()
        .from(s.offeredType)
        .where(and(eq(s.offeredType.eventId, e.id), eq(s.offeredType.type, type)))
        .get();
      requireThat(offered, 404, 'This application type is not offered.');
      const a = db
        .select()
        .from(s.application)
        .where(
          and(
            eq(s.application.eventId, e.id),
            eq(s.application.userId, actor),
            eq(s.application.type, type),
          ),
        )
        .get();
      if (!a) return { event: e, type, formVersion: offered.formVersion, application: null };
      const result = published(db, a.id);
      return {
        event: e,
        type,
        formVersion: a.formVersion,
        application: {
          id: a.id,
          type: a.type,
          version: a.version,
          updatedAt: a.updatedAt,
          submittedAt: a.submittedAt,
          status: a.status === 'draft' ? 'draft' : (result?.value ?? 'submitted'),
          publishedAt: result?.publishedAt ?? null,
          answers: {
            name: a.name,
            organization: a.organization,
            introduction: a.introduction,
            link: a.link,
            ...answers(db, a),
          },
        },
      };
    },
    saveApplication(
      slug: string,
      actor: string,
      rawType: string,
      version: number,
      input: unknown,
      submit: boolean,
    ) {
      return atomic((q) => {
        const e = getEvent(q, slug);
        active(e);
        const time = now();
        requireThat(
          time < e.closesAt && (!submit || time >= e.opensAt),
          409,
          'Applications are outside the submission window.',
        );
        const type = typeSchema.parse(rawType);
        const offered = q
          .select()
          .from(s.offeredType)
          .where(and(eq(s.offeredType.eventId, e.id), eq(s.offeredType.type, type)))
          .get();
        requireThat(offered, 404, 'Application type not offered.');
        const u = q.select().from(s.user).where(eq(s.user.id, actor)).get();
        requireThat(u, 401, 'Sign in first.');
        requireThat(!submit || u.emailVerified, 403, 'Verify your email before submitting.');
        const existing = q
          .select()
          .from(s.application)
          .where(
            and(
              eq(s.application.eventId, e.id),
              eq(s.application.userId, actor),
              eq(s.application.type, type),
            ),
          )
          .get();
        requireThat(
          existing
            ? existing.version === integer.parse(version) && existing.status === 'draft'
            : version === 0,
          409,
          'This application changed in another tab. Reload before saving.',
        );
        let data: ReturnType<typeof parseAnswers>;
        try {
          data = parseAnswers(type, offered.formVersion, input, submit);
        } catch (err) {
          throw new PortalError(400, err instanceof Error ? err.message : 'Invalid answers.');
        }
        const applicationId = existing?.id ?? id();
        const common = {
          name: data.name,
          organization: data.organization,
          introduction: data.introduction,
          link: data.link,
          status: submit ? ('submitted' as const) : ('draft' as const),
          version: version + 1,
          updatedAt: time,
          submittedAt: submit ? time : null,
        };
        if (existing)
          q.update(s.application).set(common).where(eq(s.application.id, applicationId)).run();
        else
          q.insert(s.application)
            .values({
              id: applicationId,
              eventId: e.id,
              userId: actor,
              type,
              formVersion: offered.formVersion,
              rubricVersion: offered.rubricVersion,
              ...common,
            })
            .run();
        if ('interests' in data)
          q.insert(s.hackerAnswer)
            .values({
              applicationId,
              interests: data.interests,
              experience: data.experience,
              ambition: data.ambition,
            })
            .onConflictDoUpdate({
              target: s.hackerAnswer.applicationId,
              set: {
                interests: data.interests,
                experience: data.experience,
                ambition: data.ambition,
              },
            })
            .run();
        else
          q.insert(s.mentorAnswer)
            .values({
              applicationId,
              expertise: data.expertise,
              mentoring: data.mentoring,
              availability: data.availability,
            })
            .onConflictDoUpdate({
              target: s.mentorAnswer.applicationId,
              set: {
                expertise: data.expertise,
                mentoring: data.mentoring,
                availability: data.availability,
              },
            })
            .run();
        return applicationId;
      });
    },
    createEvent(actor: string, input: unknown, slugInput: string, managerEmail: string) {
      return atomic((q) => {
        admin(q, actor);
        const values = eventInput.parse(input);
        const slug = z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .max(80)
          .parse(slugInput);
        const manager = q
          .select()
          .from(s.user)
          .where(eq(s.user.email, managerEmail.trim().toLowerCase()))
          .get();
        requireThat(manager, 400, 'The initial manager must have an existing account.');
        requireThat(
          !q.select().from(s.event).where(eq(s.event.slug, slug)).get(),
          409,
          'That URL slug is already used.',
        );
        const eventId = id();
        q.insert(s.event)
          .values({ id: eventId, slug, ...values })
          .run();
        q.insert(s.membership).values({ eventId, userId: manager.id, role: 'manager' }).run();
        log(q, actor, eventId, 'event_created', values);
        return slug;
      });
    },
    configure(
      actor: string,
      slug: string,
      version: number,
      input: unknown,
      status: string,
      types: string[],
    ) {
      return atomic((q) => {
        const e = getEvent(q, slug);
        member(q, actor, e.id, true);
        requireThat(e.version === version, 409, 'Event configuration changed. Reload.');
        const values = eventInput.parse(input);
        const nextStatus = z.enum(['draft', 'published', 'archived']).parse(status);
        requireThat(
          e.status === 'draft' || nextStatus !== 'draft',
          409,
          'Published events cannot become drafts.',
        );
        const selected = [...new Set(z.array(typeSchema).min(1).max(2).parse(types))];
        if (e.status === 'archived') {
          requireThat(nextStatus === 'published', 409, 'Unarchive the event before editing.');
          // Unarchive only, ignoring content edits until the next version.
          q.update(s.event)
            .set({ status: 'published', version: version + 1 })
            .where(eq(s.event.id, e.id))
            .run();
        } else {
          for (const existing of q
            .select()
            .from(s.offeredType)
            .where(eq(s.offeredType.eventId, e.id))
            .all()) {
            if (!selected.includes(existing.type)) {
              requireThat(
                !q
                  .select()
                  .from(s.application)
                  .where(
                    and(eq(s.application.eventId, e.id), eq(s.application.type, existing.type)),
                  )
                  .get(),
                409,
                'Cannot remove a type that has applications.',
              );
              q.delete(s.offeredType)
                .where(and(eq(s.offeredType.eventId, e.id), eq(s.offeredType.type, existing.type)))
                .run();
            }
          }
          for (const type of selected)
            q.insert(s.offeredType).values({ eventId: e.id, type }).onConflictDoNothing().run();
          q.update(s.event)
            .set({ ...values, status: nextStatus, version: version + 1 })
            .where(eq(s.event.id, e.id))
            .run();
        }
        log(q, actor, e.id, 'event_configured', {
          previous: e,
          next: values,
          status: nextStatus,
          types: selected,
        });
      });
    },
    members(actor: string, slug: string) {
      const e = getEvent(db, slug);
      const isAdmin = !!db
        .select()
        .from(s.administrator)
        .where(eq(s.administrator.userId, actor))
        .get();
      if (!isAdmin) member(db, actor, e.id, true);
      return db
        .select({
          userId: s.user.id,
          name: s.user.name,
          email: s.user.email,
          role: s.membership.role,
        })
        .from(s.membership)
        .innerJoin(s.user, eq(s.user.id, s.membership.userId))
        .where(eq(s.membership.eventId, e.id))
        .all();
    },
    changeMember(
      actor: string,
      slug: string,
      email: string,
      role: 'manager' | 'reviewer' | 'remove',
    ) {
      return atomic((q) => {
        const e = getEvent(q, slug);
        const isAdmin = !!q
          .select()
          .from(s.administrator)
          .where(eq(s.administrator.userId, actor))
          .get();
        if (!isAdmin) member(q, actor, e.id, true);
        const target = q
          .select()
          .from(s.user)
          .where(eq(s.user.email, z.email().parse(email.trim().toLowerCase())))
          .get();
        requireThat(target, 400, 'Account not found. Ask them to register first.');
        const old = q
          .select()
          .from(s.membership)
          .where(and(eq(s.membership.eventId, e.id), eq(s.membership.userId, target.id)))
          .get();
        requireThat(
          isAdmin || (old?.role !== 'manager' && role !== 'manager'),
          403,
          'Only platform administrators can change managers.',
        );
        requireThat(['manager', 'reviewer', 'remove'].includes(role), 400, 'Invalid role.');
        if (old?.role === 'manager' && role !== 'manager')
          requireThat(
            q
              .select()
              .from(s.membership)
              .where(and(eq(s.membership.eventId, e.id), eq(s.membership.role, 'manager')))
              .all().length > 1,
            409,
            'An event must retain at least one manager.',
          );
        q.delete(s.claim)
          .where(
            and(
              eq(s.claim.userId, target.id),
              inArray(
                s.claim.applicationId,
                q
                  .select({ id: s.application.id })
                  .from(s.application)
                  .where(eq(s.application.eventId, e.id)),
              ),
            ),
          )
          .run();
        if (role === 'remove')
          q.delete(s.membership)
            .where(and(eq(s.membership.eventId, e.id), eq(s.membership.userId, target.id)))
            .run();
        else
          q.insert(s.membership)
            .values({ eventId: e.id, userId: target.id, role })
            .onConflictDoUpdate({
              target: [s.membership.eventId, s.membership.userId],
              set: { role },
            })
            .run();
        log(q, actor, e.id, 'membership_changed', { userId: target.id, role });
      });
    },
    queue(
      actor: string,
      slug: string,
      filters: { type?: string; status?: string; search?: string; page?: number } = {},
    ) {
      const e = getEvent(db, slug);
      member(db, actor, e.id);
      const page = z
        .number()
        .int()
        .min(1)
        .max(10000)
        .parse(filters.page || 1);
      const latest = sql<string>`coalesce((select d.value from decision d join publication p on p.revisionId = d.id where d.applicationId = ${s.application.id} order by d.sequence desc limit 1), ${s.application.status})`;
      const conditions = [eq(s.application.eventId, e.id), ne(s.application.userId, actor)];
      if (filters.type) conditions.push(eq(s.application.type, typeSchema.parse(filters.type)));
      if (filters.status)
        conditions.push(
          sql`${latest} = ${z.enum(['draft', 'submitted', 'accepted', 'waitlisted', 'rejected']).parse(filters.status)}`,
        );
      if (filters.search)
        conditions.push(
          or(
            like(s.user.email, `%${filters.search.slice(0, 100)}%`),
            like(s.user.name, `%${filters.search.slice(0, 100)}%`),
          )!,
        );
      const where = and(...conditions);
      const total = db
        .select({ count: sql<number>`count(*)` })
        .from(s.application)
        .innerJoin(s.user, eq(s.user.id, s.application.userId))
        .where(where)
        .get()!.count;
      const rows = db
        .select({
          id: s.application.id,
          name: s.user.name,
          email: s.user.email,
          type: s.application.type,
          submission: s.application.status,
          status: latest,
          reviewedAt: s.review.completedAt,
          submittedAt: s.application.submittedAt,
          prepared: s.decision.value,
        })
        .from(s.application)
        .innerJoin(s.user, eq(s.user.id, s.application.userId))
        .leftJoin(s.review, eq(s.review.applicationId, s.application.id))
        .leftJoin(s.preparedDecision, eq(s.preparedDecision.applicationId, s.application.id))
        .leftJoin(s.decision, eq(s.decision.id, s.preparedDecision.revisionId))
        .where(where)
        .orderBy(asc(s.application.id))
        .limit(25)
        .offset((page - 1) * 25)
        .all();
      return { rows, total, page, pages: Math.max(1, Math.ceil(total / 25)) };
    },
    reviewDetail(actor: string, slug: string, applicationId: string) {
      const e = getEvent(db, slug);
      const a = applicationFor(db, actor, e.id, applicationId);
      requireThat(a.status === 'submitted', 403, 'Unfinished answers are private.');
      const prepared = db
        .select()
        .from(s.preparedDecision)
        .innerJoin(s.decision, eq(s.decision.id, s.preparedDecision.revisionId))
        .where(eq(s.preparedDecision.applicationId, a.id))
        .get()?.decision;
      const currentClaim = db.select().from(s.claim).where(eq(s.claim.applicationId, a.id)).get();
      return {
        application: a,
        answers: answers(db, a),
        review: db.select().from(s.review).where(eq(s.review.applicationId, a.id)).get() ?? null,
        claim: currentClaim
          ? {
              userId: currentClaim.userId,
              expiresAt: currentClaim.expiresAt,
              token: currentClaim.userId === actor ? currentClaim.token : null,
            }
          : null,
        prepared: prepared ?? null,
        published: published(db, a.id) ?? null,
        history: db
          .select({
            id: s.decision.id,
            sequence: s.decision.sequence,
            value: s.decision.value,
            reason: s.decision.reason,
            createdAt: s.decision.createdAt,
            publishedAt: s.release.publishedAt,
          })
          .from(s.decision)
          .leftJoin(s.publication, eq(s.publication.revisionId, s.decision.id))
          .leftJoin(s.release, eq(s.release.id, s.publication.releaseId))
          .where(eq(s.decision.applicationId, a.id))
          .orderBy(desc(s.decision.sequence))
          .all(),
      };
    },
    claim(
      actor: string,
      slug: string,
      applicationId: string,
      operation: 'acquire' | 'renew' | 'release',
      token?: string,
    ) {
      return atomic((q) => {
        z.enum(['acquire', 'renew', 'release']).parse(operation);
        const e = getEvent(q, slug);
        active(e);
        const a = applicationFor(q, actor, e.id, applicationId);
        requireThat(a.status === 'submitted', 409, 'Only submitted applications can be reviewed.');
        const r = q.select().from(s.review).where(eq(s.review.applicationId, a.id)).get();
        requireThat(!r?.completedAt, 409, 'This review is complete.');
        const old = q.select().from(s.claim).where(eq(s.claim.applicationId, a.id)).get();
        const time = now();
        if (operation === 'release') {
          if (old?.userId !== actor) member(q, actor, e.id, true);
          else requireThat(old.token === token, 409, 'This claim changed. Reload.');
          q.delete(s.claim).where(eq(s.claim.applicationId, a.id)).run();
          return null;
        }
        if (operation === 'renew')
          requireThat(
            old && old.userId === actor && old.token === token && old.expiresAt > time,
            409,
            'Claim expired or changed. Reclaim this application.',
          );
        else
          requireThat(!old || old.expiresAt <= time, 409, 'This application is already claimed.');
        const next = {
          applicationId: a.id,
          userId: actor,
          token: operation === 'renew' ? old!.token : id(),
          expiresAt: time + 20 * 60_000,
        };
        q.insert(s.claim)
          .values(next)
          .onConflictDoUpdate({ target: s.claim.applicationId, set: next })
          .run();
        q.insert(s.review)
          .values({ applicationId: a.id, updatedAt: time })
          .onConflictDoNothing()
          .run();
        return next;
      });
    },
    saveReview(
      actor: string,
      slug: string,
      applicationId: string,
      token: string,
      version: number,
      input: unknown,
      complete: boolean,
    ) {
      return atomic((q) => {
        const e = getEvent(q, slug);
        active(e);
        const a = applicationFor(q, actor, e.id, applicationId);
        const c = q.select().from(s.claim).where(eq(s.claim.applicationId, a.id)).get();
        requireThat(
          c && c.userId === actor && c.token === token && c.expiresAt > now(),
          409,
          'Claim expired or changed. Your input has been preserved.',
        );
        const r = q.select().from(s.review).where(eq(s.review.applicationId, a.id)).get();
        requireThat(
          r && !r.completedAt && r.version === version,
          409,
          'Review changed or was completed. Reload before saving.',
        );
        const score = z.number().int().min(1).max(5).nullable();
        const values = z
          .object({
            score1: score,
            score2: score,
            score3: score,
            notes: z.string().trim().max(5000),
          })
          .parse(input);
        requireThat(
          !complete || [values.score1, values.score2, values.score3].every((v) => v !== null),
          400,
          'Score every criterion before completing the review.',
        );
        q.update(s.review)
          .set({
            ...values,
            version: version + 1,
            editorId: actor,
            updatedAt: now(),
            completedAt: complete ? now() : null,
          })
          .where(eq(s.review.applicationId, a.id))
          .run();
        if (complete) q.delete(s.claim).where(eq(s.claim.applicationId, a.id)).run();
      });
    },
    prepareDecision(
      actor: string,
      slug: string,
      applicationId: string,
      value: string,
      reason: string,
      expectedSequence: number,
    ) {
      return atomic((q) => {
        const e = getEvent(q, slug);
        active(e);
        const a = applicationFor(q, actor, e.id, applicationId, true);
        const r = q.select().from(s.review).where(eq(s.review.applicationId, a.id)).get();
        requireThat(r?.completedAt, 409, 'Complete the review first.');
        const last = q
          .select()
          .from(s.decision)
          .where(eq(s.decision.applicationId, a.id))
          .orderBy(desc(s.decision.sequence))
          .get();
        requireThat(
          (last?.sequence ?? 0) === expectedSequence,
          409,
          'Decision changed. Reload before preparing.',
        );
        const current = published(q, a.id);
        const next = decisionSchema.parse(value);
        requireThat(current?.value !== next, 400, 'That decision is already published.');
        const explanation = z.string().trim().max(2000).parse(reason);
        requireThat(
          !current || explanation.length >= 5,
          400,
          'Explain the promotion or correction (at least 5 characters).',
        );
        const revisionId = id();
        q.insert(s.decision)
          .values({
            id: revisionId,
            applicationId: a.id,
            sequence: expectedSequence + 1,
            value: next,
            reason: explanation,
            actorId: actor,
            createdAt: now(),
            reviewVersion: r.version,
            previousPublishedSequence: current?.sequence ?? 0,
          })
          .run();
        q.insert(s.preparedDecision)
          .values({ applicationId: a.id, revisionId })
          .onConflictDoUpdate({ target: s.preparedDecision.applicationId, set: { revisionId } })
          .run();
        return revisionId;
      });
    },
    cancelDecision(actor: string, slug: string, applicationId: string, revisionId: string) {
      return atomic((q) => {
        const e = getEvent(q, slug);
        active(e);
        applicationFor(q, actor, e.id, applicationId, true);
        const deleted = q
          .delete(s.preparedDecision)
          .where(
            and(
              eq(s.preparedDecision.applicationId, applicationId),
              eq(s.preparedDecision.revisionId, revisionId),
            ),
          )
          .returning()
          .get();
        requireThat(deleted, 409, 'Prepared decision changed.');
        log(q, actor, e.id, 'decision_cancelled', { revisionId });
      });
    },
    releaseCandidates(actor: string, slug: string) {
      const e = getEvent(db, slug);
      member(db, actor, e.id, true);
      return db
        .select({
          revisionId: s.decision.id,
          applicationId: s.application.id,
          name: s.application.name,
          type: s.application.type,
          value: s.decision.value,
        })
        .from(s.preparedDecision)
        .innerJoin(s.decision, eq(s.decision.id, s.preparedDecision.revisionId))
        .innerJoin(s.application, eq(s.application.id, s.preparedDecision.applicationId))
        .where(and(eq(s.application.eventId, e.id), ne(s.application.userId, actor)))
        .orderBy(asc(s.decision.createdAt))
        .limit(500)
        .all();
    },
    releaseSummary(actor: string, slug: string) {
      const e = getEvent(db, slug);
      member(db, actor, e.id, true);
      const counts = db
        .select({
          total: sql<number>`count(*)`,
          unfinished: sql<number>`coalesce(sum(case when ${s.application.status} = 'draft' or ${s.review.completedAt} is null then 1 else 0 end), 0)`,
          prepared: sql<number>`count(${s.preparedDecision.revisionId})`,
        })
        .from(s.application)
        .leftJoin(s.review, eq(s.review.applicationId, s.application.id))
        .leftJoin(s.preparedDecision, eq(s.preparedDecision.applicationId, s.application.id))
        .where(and(eq(s.application.eventId, e.id), ne(s.application.userId, actor)))
        .get()!;
      const batches = db
        .select()
        .from(s.release)
        .where(
          and(
            eq(s.release.eventId, e.id),
            sql`not exists (select 1 from release_item ri join decision d on d.id = ri.revisionId join application a on a.id = d.applicationId where ri.releaseId = ${s.release.id} and a.userId = ${actor})`,
          ),
        )
        .orderBy(desc(s.release.createdAt))
        .limit(50)
        .all();
      return { counts, batches };
    },
    createRelease(actor: string, slug: string, revisionIds: string[]) {
      return atomic((q) => {
        const e = getEvent(q, slug);
        active(e);
        member(q, actor, e.id, true);
        z.array(z.string()).min(1).max(500).parse(revisionIds);
        requireThat(
          new Set(revisionIds).size === revisionIds.length,
          400,
          'Duplicate release entries.',
        );
        const owners = new Set<string>();
        for (const revisionId of revisionIds) {
          const d = q.select().from(s.decision).where(eq(s.decision.id, revisionId)).get();
          requireThat(d, 409, 'Decision no longer available.');
          applicationFor(q, actor, e.id, d.applicationId, true);
          requireThat(!owners.has(d.applicationId), 400, 'Only one revision per application.');
          owners.add(d.applicationId);
          requireThat(
            q
              .select()
              .from(s.preparedDecision)
              .where(
                and(
                  eq(s.preparedDecision.applicationId, d.applicationId),
                  eq(s.preparedDecision.revisionId, d.id),
                ),
              )
              .get(),
            409,
            'Prepared decision changed. Refresh the selection.',
          );
        }
        const releaseId = id();
        q.insert(s.release)
          .values({ id: releaseId, eventId: e.id, createdBy: actor, createdAt: now() })
          .run();
        for (const revisionId of revisionIds)
          q.insert(s.releaseItem).values({ releaseId, revisionId }).run();
        return releaseId;
      });
    },
    releaseDetail(actor: string, slug: string, releaseId: string) {
      const e = getEvent(db, slug);
      member(db, actor, e.id, true);
      const batch = db
        .select()
        .from(s.release)
        .where(and(eq(s.release.id, releaseId), eq(s.release.eventId, e.id)))
        .get();
      requireThat(batch, 404, 'Release not found.');
      const items = db
        .select({
          revisionId: s.decision.id,
          applicationId: s.application.id,
          ownerId: s.application.userId,
          name: s.application.name,
          type: s.application.type,
          value: s.decision.value,
          sequence: s.decision.sequence,
        })
        .from(s.releaseItem)
        .innerJoin(s.decision, eq(s.decision.id, s.releaseItem.revisionId))
        .innerJoin(s.application, eq(s.application.id, s.decision.applicationId))
        .where(eq(s.releaseItem.releaseId, releaseId))
        .all();
      requireThat(
        !items.some((i) => i.ownerId === actor),
        403,
        'Another manager must handle a release containing your application.',
      );
      return { ...batch, items: items.map(({ ownerId: _, ...item }) => item) };
    },
    publish(actor: string, slug: string, releaseId: string) {
      return atomic((q) => {
        const e = getEvent(q, slug);
        member(q, actor, e.id, true);
        const batch = q
          .select()
          .from(s.release)
          .where(and(eq(s.release.id, releaseId), eq(s.release.eventId, e.id)))
          .get();
        requireThat(batch, 404, 'Release not found.');
        const items = q
          .select({ decision: s.decision })
          .from(s.releaseItem)
          .innerJoin(s.decision, eq(s.decision.id, s.releaseItem.revisionId))
          .where(eq(s.releaseItem.releaseId, releaseId))
          .all();
        requireThat(items.length > 0 && items.length <= 500, 409, 'Invalid release batch.');
        for (const { decision: d } of items) applicationFor(q, actor, e.id, d.applicationId, true);
        if (batch.publishedAt !== null) return batch.publishedAt;
        active(e);
        for (const { decision: d } of items) {
          const r = q
            .select()
            .from(s.review)
            .where(eq(s.review.applicationId, d.applicationId))
            .get();
          const p = q
            .select()
            .from(s.preparedDecision)
            .where(eq(s.preparedDecision.applicationId, d.applicationId))
            .get();
          requireThat(
            r?.completedAt &&
              r.version === d.reviewVersion &&
              p?.revisionId === d.id &&
              (published(q, d.applicationId)?.sequence ?? 0) === d.previousPublishedSequence,
            409,
            'Release preview is stale. Nothing was published. Prepare a fresh release.',
          );
        }
        const time = now();
        for (const { decision: d } of items) {
          q.insert(s.publication).values({ revisionId: d.id, releaseId }).run();
          q.delete(s.preparedDecision)
            .where(eq(s.preparedDecision.applicationId, d.applicationId))
            .run();
        }
        q.update(s.release)
          .set({ publishedAt: time, publishedBy: actor })
          .where(eq(s.release.id, releaseId))
          .run();
        log(q, actor, e.id, 'decisions_published', { releaseId, count: items.length });
        return time;
      });
    },
  };
}
export type Portal = ReturnType<typeof portal>;
