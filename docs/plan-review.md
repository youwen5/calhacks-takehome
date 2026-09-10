# Build plan review

Reviewed September 10, 2026. This reviews the proposal, not implemented code.
The user accepted these suggestions, explicitly required waitlists and gated
decision release, and selected SQLite with a Nix-built Docker container running
a single Node monolith. The architecture now incorporates these decisions.
This earlier review is rationale, not a second specification. The architecture's
final implementation contract and `adversarial-review.md` supersede any earlier
recommendations or unresolved wording here.

## Assessment

The proposed monolith and event-scoped model fit the assignment. The main risks
are unresolved review semantics, deferred deployment choices, and building optional
workflows before the required applicant-to-organizer flow. Keep the implementation
small enough to explain during an interview.

## Decision status

1. Hosting/database: SQLite and a Nix-built container are selected. Actual host,
   public domain, and registry are still needed for deployment. SvelteKit remains
   the framework default.
2. Applicant types: the user requires selectable, separate application types.
   Support independent hacker and mentor applications in the same event, unique
   on `(eventId, userId, applicantType)`, replacing the earlier one-type default.
3. Decision authority: reviewers grade; managers stage and explicitly publish
   admission decisions. Waitlists and gated release are required.

The findings below explain the accepted changes; references to the former plan
describe what this review corrected, not additional unresolved requirements.

## Findings and recommended resolutions

### Separate review completion from admission decisions

The current application lifecycle has no representation of a completed review
awaiting a decision. A claim is temporary ownership, not completion. Model review
state separately (unreviewed, in progress, completed), keep draft grades saveable,
and require all rubric criteria before completing a review. Admission decisions
remain distinct from grades. Recommendation: reviewers grade; managers publish
decisions. Before publication, applicants continue to see submitted status.

Support waitlist-to-accepted/rejected transitions explicitly. Allow managers to
correct a published decision with a recorded reason. Keep a small append-only
decision history (actor, previous/new decision, timestamp, reason), rather than
importing Storke's judging undo/audit framework. Specify the exact transition table
before writing the mutation handlers.

### Move deployment validation earlier

The plan puts deployment last even though it determines the database driver and
credential setup. Select hosting first, then deploy a minimal application with a
migration and persistent synthetic record. Verify persistence through restart or
redeploy before implementing the full feature set. Perform final smoke tests again
after the feature work. Use the same database engine locally and in deployment.

### Establish organizer access without a privileged public demo

Define a documented, repeatable server-side command to grant platform administrator
access to an existing account. Event managers add existing registered accounts as
reviewers by email; an invitation-email workflow is outside the first version.
Platform administrator assignment must not be exposed through public registration.
Never automatically grant privileges based on a fictional organization domain.

Local seed users can demonstrate each role. For the public deployment, create a
restricted organizer demo account scoped to a synthetic demo event, and document
how the interview reviewers receive access. Do not expose platform administrator
credentials on the public landing page. The precise access handoff can be decided
when deploying; it does not block domain implementation.

### Bound the applicant form and persistence behavior

Use explicit Save draft and Submit actions initially, with visible save timestamps
and a warning for unsaved changes. Add optimistic concurrency using a version field
so an older browser tab cannot overwrite a newer draft. Submission must atomically
validate the current draft version, complete answers, event window, and ownership.

Proposed shared fields: name, school/organization, short introduction, and relevant
links. Hacker questions cover interests, experience, and what the applicant wants
to build or learn. Mentor questions cover expertise, mentoring experience, and
availability. Avoid copying Storke's extensive demographic and logistics forms.
Do not add resume uploads or S3 to the first version; optional portfolio/profile
URLs keep the demo independent of object storage.

Email/password sign-in, verification before final submission, and password recovery
are the proposed authentication flow. Local outbox mode must exercise those flows
without cloud credentials; live email configuration is needed for the public flow.
Document provider failure behavior and rate-limit sensitive authentication actions.

### Make event lifecycle behavior precise

Distinguish unpublished draft events from applicant application drafts: only
authorized organizers can access unpublished events. Published upcoming events
may accept saved drafts before opening; final submissions require
`opensAt <= serverNow < closesAt`. Review continues after applications close.
Archived events remain readable to their authorized users, and reject application,
review, and decision writes. Managers may unarchive an event explicitly; otherwise
archival should never accidentally leave the event permanently unmanageable.

Store event start/end times as well as application deadlines. Validate ordering and
handle timezone conversion in one module. Pin form/rubric versions to an event
before publication, and retain those versions for its applications and reviews.
Prevent changing form/rubric versions once applications exist. Fixed, versioned
forms are sufficient; there is no need for a configurable form builder.

### Reduce scope pressure from review claims

Multiple-event management already fulfills the assignment's useful-extra-feature
requirement. Keep claims as a planned enhancement after required flows are working.
Use a documented lease duration (proposed: 20 minutes), explicit renewal/release,
and a conflict response when saving after lease loss. Preserve unsaved input in the
UI on conflict. A manager can release a claim, but cannot overwrite a concurrent
review silently. A claim token/version protects against stale saves, including
when the same reviewer reacquires a claim. No background worker is needed: evaluate
expiry using server time at access and mutation boundaries.

### Specify rubric behavior without automated admissions

Use three criteria per applicant type, each scored 1–5 with short written anchors.
Suggested hacker criteria: motivation, initiative, and collaboration; mentor
criteria: relevant expertise, communication, and mentoring approach. Show a simple
total out of 15 with notes, but do not auto-accept applicants or normalize scores.
Validate integers and bounds server-side and with database constraints. Grades and
internal notes are never included in applicant-facing server responses.

## Revised build order

1. Use the resolved SQLite/container target, independent application types, and manager-controlled decision release.
2. Scaffold the monolith, auth/database boundaries, migration tooling, CI checks,
   Cal Hacks shell/favicon, and local outbox; validate a minimal deployment.
3. Implement event configuration and membership, seed two events and distinct roles,
   and prove cross-event authorization before building the larger interfaces.
4. Build and verify the two applicant forms, draft saving, and final submission.
5. Build event-filtered organizer lists, review grades/notes, and decision workflow.
6. Add review claims, then polish mobile layouts and validation/conflict states.
7. Run database integration checks and browser flows; verify the deployed version,
   write setup/provider/deployment guides, and prepare the three-minute demo script.

## Acceptance checks to prioritize

- The same account can participate independently in two events.
- The same account can submit hacker and mentor applications in one event without
  either form, review, or decision overwriting the other.
- Applicant and organizer resource IDs cannot escape the selected event or owner.
- Applicant type controls questions and validation; role escalation is rejected.
- Two stale tabs cannot overwrite drafts, reviews, or published decisions silently.
- Submission at/after closing and writes to archived events are rejected.
- Completing a review and publishing a decision follow the selected permission model.
- Verification and recovery work through a local outbox and a configured email provider.
- A new event is created through authorized UI without deployment or environment edits.
- Persistent data survives a deployment restart; a reviewer can exercise the public demo.

No application tests have run: the project currently contains documentation and
the logo asset only.
