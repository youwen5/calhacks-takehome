import { dietarySummary } from '../domain/hacker';
import { and, eq, isNull, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import type { PortalDatabase } from './db';
import * as s from './db/schema';
import { portal, PortalError } from './portal';
import { meals } from '../domain/event-day';
type Q = Pick<PortalDatabase, 'select' | 'insert' | 'update' | 'delete'>;
const requireThat = (condition: unknown, message: string, status = 409) => {
  if (!condition) throw new PortalError(status, message);
};
export function eventDay(db: PortalDatabase, now = Date.now) {
  const atomic = <T>(work: (q: Q) => T) => db.transaction(work, { behavior: 'immediate' });
  function event(q: Q, slug: string) {
    const e = q.select().from(s.event).where(eq(s.event.slug, slug)).get();
    if (!e) throw new PortalError(404, 'Event not found.');
    return e;
  }
  function team(q: Q, actor: string, eventId: string, manager = false) {
    const m = q
      .select()
      .from(s.membership)
      .where(and(eq(s.membership.eventId, eventId), eq(s.membership.userId, actor)))
      .get();
    requireThat(m && (!manager || m.role === 'manager'), 'Event team permission required.', 403);
  }
  function active(e: typeof s.event.$inferSelect) {
    requireThat(e.status === 'published', 'This event is not active.');
  }
  function accepted(q: Q, eventId: string, userId: string) {
    const apps = q
      .select({ id: s.application.id })
      .from(s.application)
      .where(and(eq(s.application.eventId, eventId), eq(s.application.userId, userId)))
      .all();
    return apps.some(
      (a) =>
        q
          .select({ value: s.decision.value })
          .from(s.decision)
          .innerJoin(s.publication, eq(s.publication.revisionId, s.decision.id))
          .where(eq(s.decision.applicationId, a.id))
          .orderBy(desc(s.decision.sequence))
          .get()?.value === 'accepted',
    );
  }
  const attendee = (q: Q, eventId: string, userId: string) =>
    q
      .select()
      .from(s.attendance)
      .where(and(eq(s.attendance.eventId, eventId), eq(s.attendance.userId, userId)))
      .get();
  const tickets = (q: Q, eventId: string, userId: string) =>
    q
      .select()
      .from(s.mealTicket)
      .where(and(eq(s.mealTicket.eventId, eventId), eq(s.mealTicket.userId, userId)))
      .all();
  function sponsor(q: Q, eventId: string, id: string) {
    const sp = q
      .select()
      .from(s.sponsor)
      .where(and(eq(s.sponsor.id, id), eq(s.sponsor.eventId, eventId)))
      .get();
    if (!sp) throw new PortalError(404, 'Sponsor not found.');
    return sp;
  }
  function log(q: Q, actor: string, eventId: string, action: string, details: unknown) {
    q.insert(s.audit)
      .values({
        id: crypto.randomUUID(),
        actorId: actor,
        eventId,
        action,
        details: JSON.stringify(details),
        createdAt: now(),
      })
      .run();
  }
  function sponsors(q: Q, eventId: string, userId?: string) {
    return q
      .select({
        id: s.sponsor.id,
        name: s.sponsor.name,
        total: sql<number>`count(${s.sponsorCode.id})`,
        redeemed: sql<number>`sum(case when ${s.sponsorCode.redeemedBy} is not null then 1 else 0 end)`,
        available: sql<number>`sum(case when ${s.sponsorCode.id} is not null and ${s.sponsorCode.redeemedBy} is null then 1 else 0 end)`,
        ownCode: sql<
          string | null
        >`max(case when ${s.sponsorCode.redeemedBy} = ${userId ?? ''} then ${s.sponsorCode.value} else null end)`,
      })
      .from(s.sponsor)
      .leftJoin(s.sponsorCode, eq(s.sponsorCode.sponsorId, s.sponsor.id))
      .where(eq(s.sponsor.eventId, eventId))
      .groupBy(s.sponsor.id)
      .orderBy(s.sponsor.name)
      .all();
  }
  function dietary(q: Q, eventId: string, userId: string) {
    const profile = q
      .select()
      .from(s.hackerProfile)
      .innerJoin(s.application, eq(s.application.id, s.hackerProfile.applicationId))
      .where(
        and(
          eq(s.application.eventId, eventId),
          eq(s.application.userId, userId),
          eq(s.application.status, 'submitted'),
        ),
      )
      .get()?.hacker_profile;
    return dietarySummary(profile);
  }
  return {
    participation(actor: string, slug: string) {
      const e = portal(db).event(slug, actor);
      return {
        accepted: accepted(db, e.id, actor),
        attendance: attendee(db, e.id, actor) ?? null,
      };
    },
    pass(actor: string, slug: string) {
      const e = portal(db).event(slug, actor);
      return {
        event: e,
        accepted: accepted(db, e.id, actor),
        attendance: attendee(db, e.id, actor) ?? null,
        meals: tickets(db, e.id, actor),
        applicationDietary: dietary(db, e.id, actor),
        sponsors: sponsors(db, e.id, actor),
      };
    },
    confirm(actor: string, slug: string, dietary: string) {
      return atomic((q) => {
        const e = event(q, slug);
        active(e);
        requireThat(
          accepted(q, e.id, actor),
          'A published acceptance is required to confirm attendance.',
          403,
        );
        const value = z.string().trim().max(1000).parse(dietary);
        q.insert(s.attendance)
          .values({ eventId: e.id, userId: actor, confirmedAt: now(), dietary: value })
          .onConflictDoUpdate({
            target: [s.attendance.eventId, s.attendance.userId],
            set: { dietary: value },
          })
          .run();
        log(q, actor, e.id, 'attendance_confirmed', {});
      });
    },
    roster(actor: string, slug: string) {
      const e = event(db, slug);
      team(db, actor, e.id);
      const people = db
        .select({
          id: s.user.id,
          name: s.user.name,
          email: s.user.email,
          organization: sql<
            string | null
          >`group_concat(distinct case when ${s.application.status} = 'submitted' then nullif(${s.application.organization}, '') end)`,
        })
        .from(s.user)
        .innerJoin(s.application, eq(s.application.userId, s.user.id))
        .where(eq(s.application.eventId, e.id))
        .groupBy(s.user.id)
        .orderBy(s.user.name)
        .all();
      // Latest decision per application, then collapse multiple accepted types to one person.
      const published = db
        .select({
          userId: s.application.userId,
          applicationId: s.application.id,
          value: s.decision.value,
          sequence: s.decision.sequence,
        })
        .from(s.application)
        .innerJoin(s.decision, eq(s.decision.applicationId, s.application.id))
        .innerJoin(s.publication, eq(s.publication.revisionId, s.decision.id))
        .where(eq(s.application.eventId, e.id))
        .orderBy(desc(s.decision.sequence))
        .all();
      const seen = new Set<string>(),
        acceptedUsers = new Set<string>();
      for (const d of published) {
        if (seen.has(d.applicationId)) continue;
        seen.add(d.applicationId);
        if (d.value === 'accepted') acceptedUsers.add(d.userId);
      }
      const attendance = db.select().from(s.attendance).where(eq(s.attendance.eventId, e.id)).all();
      const byUser = new Map(attendance.map((a) => [a.userId, a]));
      return {
        people: people.map((u) => ({
          ...u,
          accepted: acceptedUsers.has(u.id),
          confirmedAt: byUser.get(u.id)?.confirmedAt ?? null,
          checkedInAt: byUser.get(u.id)?.checkedInAt ?? null,
        })),
        mealStats: db
          .select({ meal: s.mealTicket.meal, count: sql<number>`count(*)` })
          .from(s.mealTicket)
          .where(and(eq(s.mealTicket.eventId, e.id), sql`${s.mealTicket.usedAt} is not null`))
          .groupBy(s.mealTicket.meal)
          .all(),
      };
    },
    detail(actor: string, slug: string, userId: string) {
      const e = event(db, slug);
      team(db, actor, e.id);
      const u = db
        .select({
          id: s.user.id,
          name: s.user.name,
          email: s.user.email,
          organization: sql<
            string | null
          >`group_concat(distinct case when ${s.application.status} = 'submitted' then nullif(${s.application.organization}, '') end)`,
        })
        .from(s.user)
        .innerJoin(s.application, eq(s.application.userId, s.user.id))
        .where(and(eq(s.user.id, userId), eq(s.application.eventId, e.id)))
        .groupBy(s.user.id)
        .get();
      if (!u) throw new PortalError(404, 'Attendee not found.');
      return {
        person: u,
        accepted: accepted(db, e.id, userId),
        attendance: attendee(db, e.id, userId) ?? null,
        meals: tickets(db, e.id, userId),
        applicationDietary: dietary(db, e.id, userId),
      };
    },
    checkIn(actor: string, slug: string, userId: string) {
      return atomic((q) => {
        const e = event(q, slug);
        team(q, actor, e.id);
        active(e);
        requireThat(actor !== userId, 'Ask another organizer to check you in.', 403);
        requireThat(accepted(q, e.id, userId), 'A published acceptance is required.', 403);
        const a = attendee(q, e.id, userId);
        requireThat(a, 'Confirm attendance before checking in.', 403);
        if (a!.checkedInAt) return;
        q.update(s.attendance)
          .set({ checkedInAt: now(), checkerId: actor })
          .where(and(eq(s.attendance.eventId, e.id), eq(s.attendance.userId, userId)))
          .run();
        log(q, actor, e.id, 'checked_in', { userId });
      });
    },
    meal(
      actor: string,
      slug: string,
      userId: string,
      meal: string,
      used: boolean,
      version: number,
    ) {
      return atomic((q) => {
        const e = event(q, slug);
        team(q, actor, e.id);
        active(e);
        requireThat(actor !== userId, 'Ask another organizer to manage your meals.', 403);
        requireThat(
          meals.some((m) => m.id === meal),
          'Invalid meal.',
          400,
        );
        requireThat(accepted(q, e.id, userId), 'A published acceptance is required.', 403);
        requireThat(
          attendee(q, e.id, userId)?.checkedInAt,
          'Check in before using meal tickets.',
          403,
        );
        const key = and(
          eq(s.mealTicket.eventId, e.id),
          eq(s.mealTicket.userId, userId),
          eq(s.mealTicket.meal, meal as (typeof meals)[number]['id']),
        );
        const old = q.select().from(s.mealTicket).where(key).get();
        requireThat(
          (old?.version ?? 0) === version,
          'Meal ticket changed. Reload before updating.',
        );
        const values = { usedAt: used ? now() : null, checkerId: actor, version: version + 1 };
        if (old) q.update(s.mealTicket).set(values).where(key).run();
        else
          q.insert(s.mealTicket)
            .values({
              eventId: e.id,
              userId,
              meal: meal as (typeof meals)[number]['id'],
              ...values,
            })
            .run();
        log(q, actor, e.id, used ? 'meal_used' : 'meal_restored', { userId, meal });
      });
    },
    sponsors(actor: string, slug: string) {
      const e = event(db, slug);
      team(db, actor, e.id, true);
      return sponsors(db, e.id);
    },
    sponsorDetail(actor: string, slug: string, id: string) {
      const e = event(db, slug);
      team(db, actor, e.id, true);
      const sp = sponsor(db, e.id, id);
      return {
        sponsor: sp,
        codes: db
          .select({
            id: s.sponsorCode.id,
            value: s.sponsorCode.value,
            redeemedAt: s.sponsorCode.redeemedAt,
            name: s.user.name,
            email: s.user.email,
          })
          .from(s.sponsorCode)
          .leftJoin(s.user, eq(s.user.id, s.sponsorCode.redeemedBy))
          .where(eq(s.sponsorCode.sponsorId, id))
          .orderBy(s.sponsorCode.createdAt, s.sponsorCode.id)
          .all(),
      };
    },
    createSponsor(actor: string, slug: string, name: string) {
      return atomic((q) => {
        const e = event(q, slug);
        team(q, actor, e.id, true);
        active(e);
        const id = crypto.randomUUID();
        q.insert(s.sponsor)
          .values({
            id,
            eventId: e.id,
            name: z.string().trim().min(1).max(100).parse(name),
            createdAt: now(),
          })
          .run();
        log(q, actor, e.id, 'sponsor_created', { id });
        return id;
      });
    },
    addCodes(actor: string, slug: string, id: string, input: string) {
      return atomic((q) => {
        const e = event(q, slug);
        team(q, actor, e.id, true);
        active(e);
        sponsor(q, e.id, id);
        const values = z
          .array(z.string().max(2000))
          .min(1)
          .max(500)
          .parse(
            input
              .split(/[,\n]/)
              .map((v) => v.trim())
              .filter(Boolean),
          );
        for (const value of values)
          q.insert(s.sponsorCode)
            .values({ id: crypto.randomUUID(), sponsorId: id, value, createdAt: now() })
            .run();
        log(q, actor, e.id, 'sponsor_codes_added', { id, count: values.length });
        return values.length;
      });
    },
    deleteCode(actor: string, slug: string, id: string, codeId: string) {
      return atomic((q) => {
        const e = event(q, slug);
        team(q, actor, e.id, true);
        active(e);
        sponsor(q, e.id, id);
        const code = q
          .select()
          .from(s.sponsorCode)
          .where(and(eq(s.sponsorCode.sponsorId, id), eq(s.sponsorCode.id, codeId)))
          .get();
        requireThat(code, 'Code not found.', 404);
        requireThat(!code!.redeemedBy, 'Redeemed codes must be retained.');
        q.delete(s.sponsorCode).where(eq(s.sponsorCode.id, codeId)).run();
        log(q, actor, e.id, 'sponsor_code_deleted', { id, codeId });
      });
    },
    deleteSponsor(actor: string, slug: string, id: string) {
      return atomic((q) => {
        const e = event(q, slug);
        team(q, actor, e.id, true);
        active(e);
        sponsor(q, e.id, id);
        requireThat(
          !q
            .select()
            .from(s.sponsorCode)
            .where(
              and(eq(s.sponsorCode.sponsorId, id), sql`${s.sponsorCode.redeemedBy} is not null`),
            )
            .get(),
          'Sponsors with redeemed codes must be retained.',
        );
        q.delete(s.sponsorCode).where(eq(s.sponsorCode.sponsorId, id)).run();
        q.delete(s.sponsor).where(eq(s.sponsor.id, id)).run();
        log(q, actor, e.id, 'sponsor_deleted', { id });
      });
    },
    redeem(actor: string, slug: string, id: string) {
      return atomic((q) => {
        const e = event(q, slug);
        active(e);
        sponsor(q, e.id, id);
        requireThat(accepted(q, e.id, actor), 'A published acceptance is required.', 403);
        requireThat(
          attendee(q, e.id, actor)?.checkedInAt,
          'Check in before redeeming sponsor codes.',
          403,
        );
        const existing = q
          .select()
          .from(s.sponsorCode)
          .where(and(eq(s.sponsorCode.sponsorId, id), eq(s.sponsorCode.redeemedBy, actor)))
          .get();
        if (existing) return existing.value;
        const available = q
          .select()
          .from(s.sponsorCode)
          .where(and(eq(s.sponsorCode.sponsorId, id), isNull(s.sponsorCode.redeemedBy)))
          .get();
        requireThat(available, 'No codes available for this sponsor.');
        q.update(s.sponsorCode)
          .set({ redeemedBy: actor, redeemedAt: now() })
          .where(eq(s.sponsorCode.id, available!.id))
          .run();
        log(q, actor, e.id, 'sponsor_code_redeemed', { id, codeId: available!.id });
        return available!.value;
      });
    },
  };
}
