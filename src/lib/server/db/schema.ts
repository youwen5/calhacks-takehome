import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  blob,
  text,
  integer,
  primaryKey,
  uniqueIndex,
  index,
  foreignKey,
  check,
} from 'drizzle-orm/sqlite-core';

// Better Auth's core fields. Changes must match its configuration and migrations.
export const user = sqliteTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: integer({ mode: 'boolean' }).notNull().default(false),
  image: text(),
  createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer({ mode: 'timestamp_ms' }).notNull(),
});
export const session = sqliteTable(
  'session',
  {
    id: text().primaryKey(),
    token: text().notNull().unique(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: integer({ mode: 'timestamp_ms' }).notNull(),
    createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer({ mode: 'timestamp_ms' }).notNull(),
    ipAddress: text(),
    userAgent: text(),
  },
  (t) => [index('session_user_idx').on(t.userId)],
);
export const account = sqliteTable(
  'account',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    scope: text(),
    password: text(),
    accessTokenExpiresAt: integer({ mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer({ mode: 'timestamp_ms' }),
    createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('account_user_idx').on(t.userId)],
);
export const verification = sqliteTable(
  'verification',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: integer({ mode: 'timestamp_ms' }).notNull(),
    createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

export const administrator = sqliteTable('administrator', {
  userId: text()
    .primaryKey()
    .references(() => user.id),
});
export const event = sqliteTable(
  'event',
  {
    id: text().primaryKey(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    description: text().notNull(),
    venue: text().notNull(),
    timezone: text().notNull(),
    opensAt: integer().notNull(),
    closesAt: integer().notNull(),
    startsAt: integer().notNull(),
    endsAt: integer().notNull(),
    decisionsAt: integer(),
    checkInAt: integer(),
    openingCeremonyAt: integer(),
    status: text({ enum: ['draft', 'published', 'archived'] })
      .notNull()
      .default('draft'),
    version: integer().notNull().default(1),
  },
  (t) => [
    check(
      'event_dates',
      sql`${t.opensAt} < ${t.closesAt} AND ${t.closesAt} <= ${t.startsAt} AND ${t.startsAt} < ${t.endsAt}`,
    ),
    check('event_status', sql`${t.status} IN ('draft','published','archived')`),
  ],
);
export const membership = sqliteTable(
  'membership',
  {
    eventId: text()
      .notNull()
      .references(() => event.id),
    userId: text()
      .notNull()
      .references(() => user.id),
    role: text({ enum: ['manager', 'reviewer'] }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.userId] }),
    check('member_role', sql`${t.role} IN ('manager','reviewer')`),
  ],
);
export const offeredType = sqliteTable(
  'offered_type',
  {
    eventId: text()
      .notNull()
      .references(() => event.id),
    type: text({ enum: ['hacker', 'mentor'] }).notNull(),
    formVersion: integer().notNull().default(1),
    rubricVersion: integer().notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.type] }),
    check('offered_type_name', sql`${t.type} IN ('hacker','mentor')`),
  ],
);
export const application = sqliteTable(
  'application',
  {
    id: text().primaryKey(),
    eventId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id),
    type: text({ enum: ['hacker', 'mentor'] }).notNull(),
    status: text({ enum: ['draft', 'submitted'] })
      .notNull()
      .default('draft'),
    name: text().notNull().default(''),
    organization: text().notNull().default(''),
    introduction: text().notNull().default(''),
    link: text().notNull().default(''),
    formVersion: integer().notNull(),
    rubricVersion: integer().notNull(),
    version: integer().notNull().default(1),
    updatedAt: integer().notNull(),
    submittedAt: integer(),
  },
  (t) => [
    uniqueIndex('application_owner_type').on(t.eventId, t.userId, t.type),
    uniqueIndex('application_id_type').on(t.id, t.type),
    index('application_queue').on(t.eventId, t.type, t.status, t.id),
    foreignKey({
      columns: [t.eventId, t.type],
      foreignColumns: [offeredType.eventId, offeredType.type],
    }),
    check('application_status', sql`${t.status} IN ('draft','submitted')`),
  ],
);
export const hackerAnswer = sqliteTable(
  'hacker_answer',
  {
    applicationId: text().primaryKey(),
    type: text().notNull().default('hacker'),
    interests: text().notNull(),
    experience: text().notNull(),
    ambition: text().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.applicationId, t.type],
      foreignColumns: [application.id, application.type],
    }),
    check('hacker_answer_type', sql`${t.type} = 'hacker'`),
  ],
);
export const mentorAnswer = sqliteTable(
  'mentor_answer',
  {
    applicationId: text().primaryKey(),
    type: text().notNull().default('mentor'),
    expertise: text().notNull(),
    mentoring: text().notNull(),
    availability: text().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.applicationId, t.type],
      foreignColumns: [application.id, application.type],
    }),
    check('mentor_answer_type', sql`${t.type} = 'mentor'`),
  ],
);
export const review = sqliteTable(
  'review',
  {
    applicationId: text()
      .primaryKey()
      .references(() => application.id),
    version: integer().notNull().default(1),
    editorId: text().references(() => user.id),
    score1: integer(),
    score2: integer(),
    score3: integer(),
    notes: text().notNull().default(''),
    completedAt: integer(),
    updatedAt: integer().notNull(),
  },
  (t) => [
    check(
      'review_score_bounds',
      sql`(${t.score1} IS NULL OR (typeof(${t.score1}) = 'integer' AND ${t.score1} BETWEEN 1 AND 5)) AND (${t.score2} IS NULL OR (typeof(${t.score2}) = 'integer' AND ${t.score2} BETWEEN 1 AND 5)) AND (${t.score3} IS NULL OR (typeof(${t.score3}) = 'integer' AND ${t.score3} BETWEEN 1 AND 5))`,
    ),
    check(
      'review_complete_scores',
      sql`${t.completedAt} IS NULL OR (${t.score1} IS NOT NULL AND ${t.score2} IS NOT NULL AND ${t.score3} IS NOT NULL)`,
    ),
  ],
);
export const claim = sqliteTable('claim', {
  applicationId: text()
    .primaryKey()
    .references(() => application.id),
  userId: text()
    .notNull()
    .references(() => user.id),
  token: text().notNull(),
  expiresAt: integer().notNull(),
});
export const decision = sqliteTable(
  'decision',
  {
    id: text().primaryKey(),
    applicationId: text()
      .notNull()
      .references(() => application.id),
    sequence: integer().notNull(),
    value: text({ enum: ['accepted', 'waitlisted', 'rejected'] }).notNull(),
    reason: text().notNull(),
    actorId: text()
      .notNull()
      .references(() => user.id),
    createdAt: integer().notNull(),
    reviewVersion: integer().notNull(),
    previousPublishedSequence: integer().notNull(),
  },
  (t) => [
    uniqueIndex('decision_sequence').on(t.applicationId, t.sequence),
    check('decision_value', sql`${t.value} IN ('accepted','waitlisted','rejected')`),
  ],
);
export const preparedDecision = sqliteTable('prepared_decision', {
  applicationId: text()
    .primaryKey()
    .references(() => application.id),
  revisionId: text()
    .notNull()
    .unique()
    .references(() => decision.id),
});
export const release = sqliteTable('release', {
  id: text().primaryKey(),
  eventId: text()
    .notNull()
    .references(() => event.id),
  createdBy: text()
    .notNull()
    .references(() => user.id),
  createdAt: integer().notNull(),
  publishedBy: text().references(() => user.id),
  publishedAt: integer(),
});
export const releaseItem = sqliteTable(
  'release_item',
  {
    releaseId: text()
      .notNull()
      .references(() => release.id),
    revisionId: text()
      .notNull()
      .references(() => decision.id),
  },
  (t) => [primaryKey({ columns: [t.releaseId, t.revisionId] })],
);
// Publication is an immutable association; revisions themselves are never updated.
export const publication = sqliteTable('publication', {
  revisionId: text()
    .primaryKey()
    .references(() => decision.id),
  releaseId: text()
    .notNull()
    .references(() => release.id),
});
export const audit = sqliteTable('audit', {
  id: text().primaryKey(),
  eventId: text()
    .notNull()
    .references(() => event.id),
  actorId: text()
    .notNull()
    .references(() => user.id),
  action: text().notNull(),
  details: text().notNull(),
  createdAt: integer().notNull(),
});

// Keep PDF bytes out of ordinary application selects and serialized page data.
export const resume = sqliteTable('resume', {
  applicationId: text()
    .primaryKey()
    .references(() => application.id),
  filename: text().notNull(),
  bytes: blob({ mode: 'buffer' }).notNull(),
  updatedAt: integer().notNull(),
});

export const attendance = sqliteTable(
  'attendance',
  {
    eventId: text()
      .notNull()
      .references(() => event.id),
    userId: text()
      .notNull()
      .references(() => user.id),
    confirmedAt: integer().notNull(),
    dietary: text().notNull().default(''),
    checkedInAt: integer(),
    checkerId: text().references(() => user.id),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] })],
);
export const mealTicket = sqliteTable(
  'meal_ticket',
  {
    eventId: text().notNull(),
    userId: text().notNull(),
    meal: text({ enum: ['breakfast', 'lunch', 'dinner', 'snack'] }).notNull(),
    usedAt: integer(),
    checkerId: text()
      .notNull()
      .references(() => user.id),
    version: integer().notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.userId, t.meal] }),
    foreignKey({
      columns: [t.eventId, t.userId],
      foreignColumns: [attendance.eventId, attendance.userId],
    }),
    check('meal_type', sql`${t.meal} in ('breakfast','lunch','dinner','snack')`),
  ],
);
export const sponsor = sqliteTable('sponsor', {
  id: text().primaryKey(),
  eventId: text()
    .notNull()
    .references(() => event.id),
  name: text().notNull(),
  createdAt: integer().notNull(),
});
export const sponsorCode = sqliteTable(
  'sponsor_code',
  {
    id: text().primaryKey(),
    sponsorId: text()
      .notNull()
      .references(() => sponsor.id),
    value: text().notNull(),
    redeemedBy: text().references(() => user.id),
    redeemedAt: integer(),
    createdAt: integer().notNull(),
  },
  (t) => [uniqueIndex('one_code_per_sponsor_user').on(t.sponsorId, t.redeemedBy)],
);
