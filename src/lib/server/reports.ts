import { and, eq, isNotNull, sql, getTableColumns } from 'drizzle-orm';
import type { PortalDatabase } from './db';
import * as s from './db/schema';
import { portal, PortalError } from './portal';

export type ExportKind = 'participants' | 'applications' | 'accepted';
export type Period = 'all' | 'week' | 'today';
export function reports(db: PortalDatabase, now = Date.now) {
  function access(actor: string, slug: string, manager = false) {
    const p = portal(db);
    const event = p.event(slug, actor);
    const membership = p.identity(actor).memberships.find((m) => m.eventId === event.id);
    if (!membership || (manager && membership.role !== 'manager'))
      throw new PortalError(403, 'Event team access required.');
    return event;
  }
  // A single current publication per application; prepared revisions never enter reports.
  const latest = db
    .select({
      applicationId: s.decision.applicationId,
      sequence: sql<number>`max(${s.decision.sequence})`.as('latest_sequence'),
    })
    .from(s.publication)
    .innerJoin(s.decision, eq(s.decision.id, s.publication.revisionId))
    .groupBy(s.decision.applicationId)
    .as('latest_publication');
  const current = db
    .select({ applicationId: s.decision.applicationId, value: s.decision.value })
    .from(s.publication)
    .innerJoin(s.decision, eq(s.decision.id, s.publication.revisionId))
    .innerJoin(
      latest,
      and(
        eq(latest.applicationId, s.decision.applicationId),
        eq(latest.sequence, s.decision.sequence),
      ),
    )
    .as('current_publication');
  function rows(eventId: string) {
    return db
      .select({
        id: s.application.id,
        userId: s.application.userId,
        type: s.application.type,
        submission: s.application.status,
        submittedAt: s.application.submittedAt,
        organization: sql<string>`case when ${s.application.status} = 'submitted' then ${s.application.organization} else '' end`,
        status: current.value,
        completedAt: s.review.completedAt,
        reviewerId: s.review.editorId,
        score1: s.review.score1,
        score2: s.review.score2,
        score3: s.review.score3,
      })
      .from(s.application)
      .leftJoin(current, eq(current.applicationId, s.application.id))
      .leftJoin(s.review, eq(s.review.applicationId, s.application.id))
      .where(eq(s.application.eventId, eventId))
      .all();
  }
  const day = (time: number, timezone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(time);
  const distribution = (values: string[]) => {
    const counts = new Map<string, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    return [...counts]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  };
  return {
    analytics(actor: string, slug: string, type = '') {
      const event = access(actor, slug);
      if (type && type !== 'hacker' && type !== 'mentor')
        throw new PortalError(400, 'Invalid application type.');
      const all = rows(event.id).filter((row) => !type || row.type === type);
      const submitted = all.filter((row) => row.submission === 'submitted');
      const reviewed = submitted.filter((row) => row.completedAt !== null);
      const timeline = distribution(
        submitted.map((row) => day(row.submittedAt!, event.timezone)),
      ).sort((a, b) => a.label.localeCompare(b.label));
      return {
        total: all.length,
        submitted: submitted.length,
        drafts: all.length - submitted.length,
        reviewed: reviewed.length,
        pending: submitted.length - reviewed.length,
        statuses: distribution(
          all.map((row) => (row.submission === 'draft' ? 'draft' : (row.status ?? 'submitted'))),
        ),
        types: distribution(all.map((row) => row.type)),
        organizations: distribution(
          submitted.map((row) => row.organization || 'Not specified'),
        ).slice(0, 20),
        timeline,
        // Exclude the acting organizer's application from grade aggregates too.
        scores: distribution(
          reviewed
            .filter((row) => row.userId !== actor)
            .map((row) => String(row.score1! + row.score2! + row.score3!)),
        ).sort((a, b) => Number(a.label) - Number(b.label)),
      };
    },
    leaderboard(actor: string, slug: string, period: string) {
      const event = access(actor, slug);
      if (!['all', 'week', 'today'].includes(period)) throw new PortalError(400, 'Invalid period.');
      const today = day(now(), event.timezone);
      const reviews = rows(event.id).filter(
        (row) =>
          row.completedAt !== null &&
          (period === 'all' ||
            (period === 'today'
              ? day(row.completedAt!, event.timezone) === today
              : row.completedAt! >= now() - 7 * 86_400_000)),
      );
      const people = db
        .select({ id: s.user.id, name: s.user.name })
        .from(s.user)
        .innerJoin(s.review, eq(s.review.editorId, s.user.id))
        .innerJoin(s.application, eq(s.application.id, s.review.applicationId))
        .where(and(eq(s.application.eventId, event.id), isNotNull(s.review.completedAt)))
        .all();
      const names = new Map(people.map((person) => [person.id, person.name]));
      const leaders = new Map<
        string,
        {
          id: string;
          name: string;
          total: number;
          accepted: number;
          waitlisted: number;
          rejected: number;
          unreleased: number;
        }
      >();
      for (const row of reviews) {
        if (!row.reviewerId) continue;
        const leader = leaders.get(row.reviewerId) ?? {
          id: row.reviewerId,
          name: names.get(row.reviewerId) ?? 'Former reviewer',
          total: 0,
          accepted: 0,
          waitlisted: 0,
          rejected: 0,
          unreleased: 0,
        };
        leader.total++;
        leader[row.status ?? 'unreleased']++;
        leaders.set(leader.id, leader);
      }
      return [...leaders.values()].sort(
        (a, b) => b.total - a.total || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
      );
    },
    warehouse(actor: string, slug: string) {
      const event = access(actor, slug, true);
      const all = rows(event.id);
      return {
        participants: new Set(all.map((row) => row.userId)).size,
        applications: all.filter((row) => row.submission === 'submitted').length,
        accepted: all.filter((row) => row.status === 'accepted').length,
      };
    },
    export(actor: string, slug: string, kind: string) {
      const event = access(actor, slug, true);
      if (!['participants', 'applications', 'accepted'].includes(kind))
        throw new PortalError(400, 'Invalid export.');
      let records: Record<string, unknown>[];
      if (kind === 'participants') {
        records = db
          .selectDistinct({
            userId: s.user.id,
            name: s.user.name,
            email: s.user.email,
            emailVerified: s.user.emailVerified,
          })
          .from(s.user)
          .innerJoin(s.application, eq(s.application.userId, s.user.id))
          .where(eq(s.application.eventId, event.id))
          .all();
      } else {
        records = db
          .select({
            applicationId: s.application.id,
            type: s.application.type,
            name: s.application.name,
            email: s.user.email,
            organization: s.application.organization,
            introduction: s.application.introduction,
            link: s.application.link,
            submittedAt: s.application.submittedAt,
            status: sql<string>`coalesce(${current.value}, 'submitted')`,
            interests: s.hackerAnswer.interests,
            experience: s.hackerAnswer.experience,
            ambition: s.hackerAnswer.ambition,
            expertise: s.mentorAnswer.expertise,
            mentoring: s.mentorAnswer.mentoring,
            availability: s.mentorAnswer.availability,
            resumeFilename: s.resume.filename,
            ...Object.fromEntries(
              Object.entries(getTableColumns(s.hackerProfile)).filter(
                ([key]) => key !== 'applicationId',
              ),
            ),
          })
          .from(s.application)
          .innerJoin(s.user, eq(s.user.id, s.application.userId))
          .leftJoin(current, eq(current.applicationId, s.application.id))
          .leftJoin(s.hackerAnswer, eq(s.hackerAnswer.applicationId, s.application.id))
          .leftJoin(s.mentorAnswer, eq(s.mentorAnswer.applicationId, s.application.id))
          .leftJoin(s.resume, eq(s.resume.applicationId, s.application.id))
          .leftJoin(s.hackerProfile, eq(s.hackerProfile.applicationId, s.application.id))
          .where(
            and(
              eq(s.application.eventId, event.id),
              eq(s.application.status, 'submitted'),
              kind === 'accepted' ? eq(current.value, 'accepted') : undefined,
            ),
          )
          .all();
      }
      db.insert(s.audit)
        .values({
          id: crypto.randomUUID(),
          actorId: actor,
          eventId: event.id,
          action: 'data_exported',
          details: JSON.stringify({ kind, count: records.length }),
          createdAt: now(),
        })
        .run();
      return records;
    },
  };
}
// Quote every cell and neutralize spreadsheet formula prefixes, including leading whitespace.
export function toCsv(records: Record<string, unknown>[]) {
  if (!records.length) return '';
  const keys = Object.keys(records[0]);
  const cell = (value: unknown) => {
    let text = value == null ? '' : String(value);
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return [
    keys.map(cell).join(','),
    ...records.map((row) => keys.map((key) => cell(row[key])).join(',')),
  ].join('\r\n');
}
