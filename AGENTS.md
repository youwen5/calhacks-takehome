# Working agreements

## Purpose and scope

Build an interview take-home hackathon application portal. Read `docs/requirements.md`
and `docs/architecture.md` before implementation. This directory is the new project;
`../storke` is a production reference, not a dependency or a place to make changes.
The assignment and the user's instructions outrank reference documentation.
`docs/architecture.md` and `docs/requirements.md` define the current plan; review
documents record rationale. Implement the acceptance cases in `docs/adversarial-review.md`.

## Current state

The application is implemented in this directory. Use `nix develop` for Node, pnpm,
Chromium, and SQLite. Run `pnpm check`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`;
`pnpm format` applies the committed formatter. Nix builds the app and OCI image.
The current user instruction explicitly prohibits production deployment: prepare
and locally verify artifacts only. Never describe local smoke tests as deployment.

## Maintainability

- Deploy one Node monolith with SQLite in a Nix-built self-contained OCI/Docker
  image. Persist the database in `/data`; commit migrations and run them before
  serving requests. Do not embed runtime secrets or database files in the image.
- Separate submission, review completion, prepared decisions, and published results.
  Reviewers grade; event managers publish. Never expose unpublished decisions in
  applicant responses. Preserve the previous published result while preparing a
  waitlist promotion or correction. Record decision revisions and release batches.
- Deny self-review and self-decision operations across application types and mixed
  batches. Recheck membership at mutation time. Publish exact prepared revisions
  atomically and idempotently; reject stale releases without partial publication.

- Favor one full-stack application with explicit, typed domain functions.
- Keep request handlers small: authenticate, validate, call a domain operation,
  return a response. Avoid building a generic repository or workflow framework.
- Keep database access, credentials, and authentication configuration in server-only
  modules. Derive identity and organizer privileges from the trusted session.
- Validate untrusted input on the server. Never accept an applicant-supplied role,
  owner ID, grade, or review decision as authoritative.
- Model applicant type separately from organizer permissions. Check permissions in
  every server entry point; hiding navigation is not authorization.
- Support multiple database-backed events in one deployment. Resolve event context
  from explicit URLs; never use an environment variable or mutable global current
  event. Scope all event data operations and organizer authorization to that event.
- Accounts are shared; users select from an event's offered application types and
  may apply to multiple types in the same event. Keep drafts, reviews, and decisions
  independent; enforce uniqueness on `(eventId, userId, applicantType)`. Organizer
  memberships are event-specific. Check cross-event resource access on the server.
- New events must be manageable through authorized UI without a redeploy. Preserve
  archived event history and enforce deadlines and archive rules on the server.
- Define application transitions in one place. Use conditional writes or
  transactions for submissions, review claims, and decisions that can race.
- Commit schema migrations with schema changes. Check foreign keys and uniqueness
  constraints against the actual scope of the product.
- Prefer small accessible components and ordinary forms. Include validation,
  empty, pending, success, and error states; support keyboard and mobile use.
- Use one package manager and commit its lockfile. Document the commands that
  actually work; update this file when tooling is selected.
- Explain consequential choices and tradeoffs in `docs/architecture.md`. Comments
  should explain intent or constraints rather than narrating syntax.

## Reference reuse

Use Colmena as the application wordmark and page-title suffix. Cal Hacks remains
the organization and event brand. Prefer direct headings and useful explanatory
copy over marketing heroes, taglines, and decorative title/subtitle pairs.
Storke's design is the baseline, not loose inspiration: use its Source Serif 4 font,
stone light/dark colors, split auth layout, compact controls, sidebar, and page motion.
Heavily mimic comparable Storke pages; diverge only to support different features.
Record reused assets/styles in `docs/branding.md` and `docs/reference-review.md`.

Use Cal Hacks branding throughout the product: page titles, navigation, metadata,
forms, emails, and event copy. Replace SB Hacks logos, Storke product naming, and
organization-specific links/configuration when borrowing reference code. Preserve
accurate attribution in developer documentation. The user requests real 2025 event names and descriptions with open testing dates. Use reserved example
domains for fictional contacts. Real credentials and authentication domain policies
must still be explicitly configured rather than inferred from demo content.

The user-provided Cal Hacks logo is stored in `static/favicon.png`. Use it for the
favicon when scaffolding the application; see `docs/branding.md` for provenance.

Borrow the portal navigation, form organization, and applicant/organizer separation
from Storke. Reimplement only features justified by the assignment. Record material
code reuse so the user can explain provenance during the interview. Do not copy
production secrets, databases, applicant records, storage contents, or deployment
configuration. Use synthetic demonstration data.

Storke's judging subsystem is known broken and was not used in production, per the
principal developer. Do not use it as an implementation reference.

## External dependencies

Local development must work without AWS or other optional provider credentials.
Put integrations behind small server-only adapters with explicit development
fallbacks (for example, a local email outbox). Do not initialize cloud clients at
module import or require cloud credentials to build. Show which mode is active;
never silently discard an email while implying successful external delivery.
Development outboxes and simulated adapters must not be exposed in production.
Validate required production configuration with actionable errors.

For every integration added, document how to create the service/account, obtain
credentials, select permissions and region, configure environment variables, verify
the integration, and troubleshoot common failures. Provide `.env.example` with
placeholders and explain both credential-free development and live provider modes.
Keep secrets out of browser bundles, version control, and routine logs.

## Verification and handoff

Test permission boundaries, ownership, type-specific validation, state transitions,
grades, and concurrent review claims. Include database-backed integration checks
for constraints, mutations, event isolation, and event lifecycle rules, and an
end-to-end applicant-to-organizer flow. Seed two events to exercise returning
applicants and organizers with access to only one event.
Run type checking, relevant tests, and a production build before calling the app
ready. Document what ran and any gaps. Keep README setup and demo steps accurate.

The assignment includes a public deployment, but the current implementation
instruction prohibits production deployment. Prepare and locally verify a runnable
build and deployment configuration; report the public URL as outstanding rather
than claiming local checks fulfill it. Do not submit the interview form or contact
organizers unless the user explicitly asks.

Public event pages follow Storke's in-flow landing header and full-height timeline
banner. Schedule milestones are per-event data with documented defaults in
`src/lib/domain/schedule.ts`; they must never trigger or imply automatic decision
publication. Keep schedule validation and organizer fields aligned.

Resumes, analytics, reviewer leaderboards, and CSV/JSON warehouse exports are now
in scope. Keep PDFs private, enforce the 2 MiB file cap and version-checked draft
writes, and lock the file on submission. Never select PDF bytes in page loads.
Reports require current event membership; exports require manager membership and
must omit auth secrets, draft answers, and unpublished decisions. Use only the
latest published revision when counting statuses. Calendar-day filters use the
event timezone. Protect spreadsheet exports against formula injection.

Local seeds now use sourced 2025 Cal Hacks event names/descriptions; the user
explicitly requested keeping dates open for testing. Do not restore hypothetical
marketing copy or overwrite existing event dates during a seed rerun.

Keep applicant and organizer destinations in the sidebar, with event selection
through the allowlisted `src/lib/navigation.ts` destinations when no usable event
is present in the URL. Do not restore the organizer top navigation row or a global
current-event setting. Event creation is a collapsed workspace action, not a
sidebar destination or a permanently visible form.

Event-day check-in, meal tickets, and sponsor codes are now explicitly in scope.
Read docs/event-day.md for the contract. Keep one attendance record per event/user,
use the latest published acceptance, version meal changes, and allocate codes in
immediate transactions with one claim per sponsor/user. Preserve redeemed records.
Follow Storke’s comparable page layouts; do not copy its global-event assumptions.
Manage events belongs at the bottom of the sidebar, with creation collapsed.
