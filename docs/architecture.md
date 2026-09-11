# Architecture proposal

These decisions guide the implementation now present in this repository.
The user approved the review recommendations and selected
SQLite with a Nix-built container running one Node monolith. Waitlists and gated
decision publication are required. This file and `requirements.md` define the current
plan; review documents record rationale. The final contract below resolves earlier
ambiguities. See `adversarial-review.md` for required adversarial acceptance cases.

## Application shape

Prefer a TypeScript SvelteKit monolith, drawing on the user's existing experience
and Storke's route structure. Use Tailwind for styling, Better Auth for sessions,
Drizzle for explicit relational persistence, and Zod for input validation. Verify
supported versions and integration documentation when scaffolding. Use pnpm
consistently, with a committed lockfile.

Use SQLite locally and in production. Package the SvelteKit adapter-node output,
Node runtime, runtime dependencies, and migrations as a self-contained OCI/Docker
image built by Nix. Run one application instance with a writable persistent `/data`
volume; the database is runtime state, never image content. The image must not need
Nix or dependency installation at runtime. Live email delivery still requires provider
access. Use Storke's `flake.nix`
as a packaging reference, adapting its yarn dependency fetching to the chosen pnpm
lockfile and removing event/branding defaults.

Pin the Nix inputs and package lockfile. Run committed migrations before starting
the HTTP server, abort on migration failure, and use `exec` for the Node process
so container shutdown signals reach it. Supply secrets only at runtime. Include
CA certificates, document volume ownership, and provide a portable Compose example
without requiring access to a Docker/Podman daemon socket. A host reverse proxy
can provide HTTPS; the application container serves HTTP on port 3000.

Enable foreign keys for every connection; configure WAL and a bounded busy timeout.
Keep write transactions short and perform email/provider operations outside them.
Use SQLite-aware backups and document a restore check rather than copying a live
database file without its WAL state. Validate the built image, migration startup,
and persistence across container replacement early. The deployment host, public
domain, and registry remain to be supplied; they do not change the database choice.

Keep server rendering, reads, and form actions together in SvelteKit. Introduce JSON
API routes only where an actual client interaction needs them. Prefer concrete
domain modules over service layers that merely forward database calls.

## Implemented organization

```text
src/
  routes/
    login/, register/, forgot-password/, reset-password/
    events/            event directory and [eventSlug] applicant pages
    organizer/         event management and [eventSlug] review pages
  lib/
    components/        shared controls and portal shell
    domain/            application types, validation, transitions, rubric
    server/
      auth.ts          session configuration
      db/              schema and connection
      portal.ts        event, application, review, and release domain operations
      http.ts          authenticated request/error boundaries
      mail.ts          local outbox and live SES adapter
docs/                  requirements, decisions, demo and deployment instructions
```

## Data and behavior

Use authentication tables owned by the auth library. Accounts are global; applicant
type (`hacker` or `mentor`) belongs to an application for a particular event. A user
can apply as both a hacker and a mentor in the same event, as well as across events. Organizer
privileges belong to event memberships assigned through a trusted administrative
path, never through public registration.

Use an application row for event ID, owner, applicant type, lifecycle status, and timestamps.
Use typed detail tables for hacker and mentor answers, with a transaction ensuring
that the selected type matches the stored details. Keep shared questions on the
application. Enforce one application per `(eventId, userId, applicantType)` so each
type has its own draft, submission, review, and published decision. Application type
is immutable after creation; choosing another type opens or creates that type's
application rather than converting or overwriting the existing one.

Maintain a typed application-type registry containing labels, questions, validators,
and rubric versions, initially hacker and mentor. Store an event's enabled types in
an `eventApplicationType` table unique on `(eventId, applicantType)`, and reference
that pair from applications. Managers choose offered types when configuring events.
Validate availability on the server. Pin form/rubric versions when the type is first
publicly offered; never change those pinned versions. Once applications exist for a
type, do not remove it. Adding a new kind of form is a documented
code change; offering an existing type at another event is a UI operation.

The event page displays type cards and the user's progress for each, with separate
Apply/Continue/View actions. Use applicant URLs such as
`/events/[eventSlug]/applications/[applicantType]`. Organizer queues filter by type
and show type labels on every review. Release previews group counts by type as well.
Never infer which application to load from identity alone. Initial scope permits
independent acceptance for multiple types, without a mutual-exclusion rule.

Keep three independent states: application submission (`draft`, `submitted`), review
progress (`unreviewed`, `in_progress`, `completed`), and admission decisions
(`accepted`, `waitlisted`, `rejected`) with explicit publication. Applicants edit
drafts; reviewers save grades and complete reviews; managers prepare and publish
decisions. Centralize transitions and check expected versions in the writes.

Use explicit draft saving and version checks to prevent stale-tab overwrites.
Start with concise shared questions, type-specific essays, and optional profile
links and optional PDF resumes stored in SQLite. Object storage is not required. Use three
anchored rubric criteria per type scored as integers 1–5, summed without normalization
or automatic admission thresholds. Require complete grades before review completion.

Store rubric grades and internal notes in a review record, with reviewer and
timestamps. Define small bounded rubric criteria appropriate to each applicant
type and document the rubric in the UI. Keep grades distinct from admission
decisions. Applicant responses expose only their own answers and public status,
not internal notes, grades, review progress, or unpublished decisions.

## Waitlists and decision release

Managers stage admission decisions separately from applicant-visible results.
Provide a preview of an event's prepared release with counts by decision and an
explicit Publish action. The first version uses manual release, not a scheduled
worker. A release publishes a selected batch of prepared decisions atomically;
incomplete/unreviewed applications are excluded and clearly counted in the preview.
Check permissions, event, review completion, and expected decision versions inside
the transaction so a stale preview cannot publish changed decisions silently.

Each decision revision records application, decision, actor, timestamp, reason,
and publication/release association. Preserve published revisions; stage later
changes as new revisions. Applicants see their latest published decision, or
`submitted` if no decision has been published. Staging a change must never hide
or alter the previously published result. Enforce this projection on the server
for pages and APIs, rather than merely hiding fields in the UI.

| Current published result | Permitted next prepared result                                      | Publication behavior                     |
| ------------------------ | ------------------------------------------------------------------- | ---------------------------------------- |
| None                     | Accepted, waitlisted, rejected after completed review               | Remains submitted until release          |
| Waitlisted               | Accepted or rejected                                                | Remains waitlisted until next release    |
| Accepted or rejected     | A different decision, as an explicit manager correction with reason | Keeps previous result until next release |

Provide a waitlist filter and manager action to prepare promotion or rejection.
Waitlists are unranked initially; no automatic promotion, capacity enforcement, RSVP,
or acceptance expiry is implied. A promotion can be released individually or with
another batch. Release retries must be idempotent and decision history append-only.
Do not send notifications about staged decisions. Portal publication is the source
of truth; admission notification email is outside the first version. Authentication
verification and recovery emails remain required.

The further enhancement is an expiring review claim. Use an atomic conditional
update to claim only an unclaimed or expired application. Require the current
claim owner for review writes, provide release, and test simultaneous claims.
Use a 20-minute lease with explicit renewal/release and a new token per acquisition.

## Multiple events

Events are database records, not an `EVENT` environment variable or process-wide
current-event setting. Give each event an immutable ID, unique stable URL slug,
display name, description, timezone, application opening/closing instants, and a
publication lifecycle (`draft`, `published`, `archived`). Store instants in UTC and
use the event's IANA timezone for display and configuration. Published events accept
submissions only within their application window; archived events preserve history
and are read-only. Allow draft saving before opening, but reject applicant writes
after closing. Final submission requires `opensAt <= serverNow < closesAt`; review
and decision publication can continue after closing. Only authorized organizers
can see unpublished events. Managers may explicitly unarchive an event before
resuming writes. Store event start/end times separately from application deadlines.
Enforce these rules on the server, including deadline races.

Applicant routes use `/events/[eventSlug]/...`; organizer routes use
`/organizer/[eventSlug]/...`. Resolve the slug to an event ID server-side. Include
that ID in every application lookup, mutation, review queue, aggregate, and export.
The event selector navigates to these URLs rather than changing global session state,
so two browser tabs can safely work on different events.

Use an event membership table unique on `(eventId, userId)`, with manager and reviewer
permissions. Managers configure their event and its organizer memberships; reviewers
review applications for their assigned events. A separately provisioned platform
administrator can create events and assign initial managers. Being an organizer
for one event grants no access to another. Never allow a user to review their own
application, even if they also have an organizer membership.

Application details, reviews, and claims inherit event ownership through their
application foreign key. If a child table also stores event ID, enforce consistency
with a composite foreign key. Validate both resource ownership and event membership
in each server operation; an application ID from another event must not bypass scope.

Provide organizer UI for event creation, configuration, publication, and archival
according to the permissions above. Adding an event must require neither a deploy
nor environment edits. Start each new event with independent applications and reviews;
do not copy previous applicant records. Keep type-specific questions and rubrics in
versioned code initially, with the version recorded on applications/reviews so future
changes do not silently reinterpret historical data. A custom form builder is outside
the initial scope.

Pin form and rubric versions per offered event application type at first publication,
including types added to an already published event. Bootstrap platform administrators through a documented
server-side command for existing accounts. Managers grant event memberships to
existing accounts by email; invitation emails are outside the first version.

Seed at least two synthetic events, a returning applicant, and an organizer assigned
to only one event. Verify independent applications, event filters, deadlines, archival,
and denial of cross-event reads/writes using real database integration tests.

## UI direction

Heavily mimic Storke on comparable pages: Source Serif 4, stone light/dark colors,
split-screen auth, compact controls, sidebar/mobile drawer, grouped forms, review
answers, and content transitions. Keep Colmena as the wordmark and Cal Hacks as the
organization. Reuse the original decorative auth artwork and the provided Cal Hacks
logo; provenance is in `branding.md`. Differing features—multiple events, separate
application types, claims, and decision releases—use the same visual conventions.
The explore page remains a simple list without its removed marketing hero.

## Deliberate tradeoffs

Multiple events share one deployment and authentication system. Two applicant types,
fixed versioned forms, and one reviewer per active application keep the model
explainable. Avoid project judging, automated ranking, distributed queues,
and file storage dependencies. Live authentication email is required; admission
notification email is deferred. Document recovery and email behavior when implemented.

## Provider configuration and local fallbacks

The user requires graceful development behavior when backend credentials are absent.
Authentication emails should go through one server-only adapter with an explicit
local outbox mode and a real provider mode. With no provider credentials, development
uses the local outbox so verification and reset flows can still be exercised end to
end. Keep the outbox local, untracked, and unavailable in production; sensitive action
links must not appear in routine logs. Do not falsely report delivery through AWS.

Choose providers only when needed. If AWS SES is selected, its setup guide must cover
obtaining AWS access, configuring a sender identity and DNS verification, region,
least-privilege send permissions, credential acquisition/configuration, sandbox
recipient restrictions and production-access requests, and sending a test email.
Consult current official provider documentation when implementing this guide.
Explain all environment variables in `.env.example`, including how to select the
fallback and how to enable live sending locally.

Builds must not depend on cloud access. Initialize providers only when their operation
is needed, and validate the selected mode's configuration with actionable messages.
Missing optional credentials may select a documented development fallback; required
production integrations must fail clearly rather than silently simulate success.
Test both absent-credential development behavior and configured-provider errors.

## Final implementation contract

These rules resolve ambiguities identified in the adversarial review.

### Permissions and response boundaries

Only platform administrators create events and appoint/remove managers. Managers
add/remove reviewers, but cannot grant manager/platform privileges. Protect the last
manager from removal. Managers can review other applicants using reviewer claim rules.
Platform administration does not bypass event membership for review/decision operations.

Self-ownership restrictions cover all of a user's application types: no organizer-side
internal reads, claiming, grading, preparing/cancelling decisions, or publishing for
their own applications. Exclude those items from organizer queues; reject direct
access. Reject an entire release containing the acting manager's application and
require another non-owner manager. Recheck event membership inside each mutation;
revocation invalidates active claims. Membership control remains available on archived
events so access can always be revoked.

Applicants see `draft` for drafts, `submitted` after submission with no released
decision, and otherwise their latest published result. Use explicit response DTOs
for pages and APIs, never database-row spreading. Internal grades, review progress,
and prepared decisions never enter applicant responses or shared/public caches.
Organizers may list draft existence/type/status but cannot read unfinished answers.
Snapshot submitted answers so later profile edits cannot alter the material reviewed.

### Review and release consistency

Keep one versioned review per application. Draft grades remain editable under the
current claim; completed reviews are immutable in this version and completion ends
the claim. Decision corrections do not edit completed grades. Writes require a
matching unexpired claim token, current membership, and expected review version.
Revocation/forced release invalidates the token, including when the same user later
reacquires a lease. Preserve input and show a conflict on failed saves.

Keep one current prepared decision revision per application. Each revision has a
monotonic per-application sequence and references its completed review version.
Editing a preparation appends/supersedes instead of mutating history; cancellation
preserves both history and any currently published result.

Persist an explicit release draft containing exact revision IDs, at most one per
application and at most 500 items, all belonging to one event. Never publish by
rerunning a live filter. Preview those exact items. In one short transaction,
recheck membership, ownership, event lifecycle, review completion, current prepared
revision, and expected last-published sequence for every item. One stale/invalid
item rejects the entire release, with conflicts shown for a refreshed preview.
Do not silently publish a subset. Publication and marking the release complete
commit together.

The release ID is the idempotency key. Retry after commit returns the original
result to an authorized caller. Competing batches cannot both publish from the
same expected application state. Order decisions by sequence, not timestamps.
Larger waves use multiple explicit batches; whole-event atomic release is outside
the initial scope. No provider calls occur inside publication transactions.

### Events, forms, and time

Pin form/rubric versions per offered type when first publicly offered, including
types added to an already published event. Do not change those versions afterward;
retain their validators, renderers, and rubric definitions across deployments.
An offered type with applications cannot be removed. All types initially share the
event's application window. Published events cannot revert to draft or be hard-deleted.

Validate `opensAt < closesAt <= startsAt < endsAt`. Reject ambiguous/nonexistent local
times unless explicitly resolved by an offset. Check current server time after
acquiring the write transaction so lock waits cannot bypass closing. Event configuration
writes require expected versions; record actor/time for deadline and lifecycle changes.
Archival preserves content; explicit manager unarchive and membership controls are
the allowed control operations while archived.

### Deployment and authentication

Use a local filesystem volume and exactly one writer instance, including deployments.
Stop the old instance before migration/startup and accept brief downtime. Bundle a
runtime migration entry point rather than depending on schema-generation tooling at
startup. Verify native database dependencies inside the actual Nix image early.
Back up before migration; reverting the image does not revert the database schema.
Document restoration for incompatible rollback and test it.

Default live mail to AWS SES and development mail to a local-only outbox. Explicitly
configured live sending failures never fall back silently. Validate production mail
configuration at startup without requiring a test send. Failed verification delivery
leaves a recoverable account with a resend path. Reset/resend responses must not reveal
whether an account exists. Keep auth-library origin/CSRF protection, configure the
real HTTPS origin and proxy trust, restrict return paths to the application, and set
bounded request sizes and rate limits. Render essays/notes as text; profile links
allow HTTP(S) only. No public demo outbox or seeded platform-admin password.

Use indexed event/type/status lists and bounded pagination. Automatic
promotions, ranking, RSVP, scheduled release, and admission emails are deferred.
Verify representative seeded-data performance before claiming scale.

### Public event schedule and layout

The signed-out header lives inside the same 768px content column as the event
list, following Storke's landing-page flow. Event details use a stretching banner
beside the complete timeline; application-type choices follow below. On mobile,
the banner stacks above the timeline.

Events have three nullable schedule columns: decisionsAt, checkInAt, and
openingCeremonyAt. Managers can edit them with explicit timezone offsets in event
settings. Blank values use the shared eventSchedule helper: decisions halfway
between application close and event start, check-in at event start, and opening
ceremony one hour after check-in (or halfway to event end for short events).
These predictable hypothetical defaults also support existing events without
rewriting their dates during migration. Changing event dates recomputes only blank
milestones; explicit milestones must still fit the revised window.

Server validation requires close <= decisions <= start <= check-in <= ceremony <
end. The timeline is a planned schedule, not evidence of publication or attendance.
Passing the decision date never releases decisions; exact manager-approved release
batches remain the only publication mechanism. The migration adds nullable columns
and preserves all existing event/application data.

### Resumes and organizer reporting

The September 11 follow-up expands scope to PDF resumes, application analytics,
a reviewer leaderboard, and a data warehouse. These are implemented features,
superseding the earlier deferrals of uploads and exports.

Resumes are optional on both application types. A dedicated SQLite table stores
one PDF per application, its display filename, and timestamp. Keeping small files
in SQLite makes application/file writes atomic and includes files in existing
backup/restore and volume persistence. There is no S3 dependency or credential
setup. The tradeoff is database growth (up to 2 MiB per application); a larger
service could move bytes to private object storage behind the same authorization.

Application POST bodies are capped at 2 MiB + 64 KiB while ordinary forms retain
the 64 KiB cap. Body reads enforce limits even without Content-Length. The server
checks PDF extension, signature, end marker, and size; this is format screening,
not antivirus or comprehensive PDF validation. Filenames are sanitized metadata,
never paths. Draft uploads can be replaced/removed, with the same version checks
and transaction as the answers. Submission freezes both. Files are never serialized
into page data; owner reads and submitted-application reviewer reads go through a
private authenticated endpoint, checking current event membership every time.
PDF responses use nosniff, no-store, same-origin framing, and a sandbox CSP. Native
browser PDF preview is embedded in applicant and reviewer pages, with an open-PDF
fallback for browsers without embedded viewing. Existing applications remain valid
without a resume; a file must be reselected if a form submission fails.

Application analytics show draft/submitted/reviewed counts, published statuses,
type distribution, submission dates in the event timezone, top 20 organizations,
and completed score totals. Draft answers stay private; the acting organizer's
application is excluded from score aggregates. Fields not collected (demographics,
RSVP/check-in, graduation years) have no invented chart values.

The reviewer leaderboard counts completed reviews, independently of release.
Filters cover all time, the trailing seven days, and today in the event timezone.
Outcome columns use the latest published revision, never pending preparations.
The application reviewer remains credited after a manager promotes a waitlist entry.
Current event members can view reports; platform-wide admin status alone is not
sufficient. Manager-only data warehouse exports participants associated with this
event, submitted applications, and currently accepted applications in CSV or JSON.
Accepted is not labeled confirmed attendance: this portal has no RSVP workflow.
Exports omit auth secrets, private draft responses, unpublished decisions, grades,
and PDF bytes (only the resume filename is included). CSV cells neutralize formula
prefixes and escape commas, quotes, and newlines. Exports are recorded in the audit
log and served with private/no-store headers. These are data exports, not a complete
backup; use the SQLite backup command for disaster recovery.

Reports query event-scoped relational data without external analytics services.
Aggregations run over compact result sets, with no per-application query loop.
Exports materialize the selected event dataset in memory; very large essay datasets
would warrant streaming or background export generation. No scale/load claim is
made from the functional checks.
