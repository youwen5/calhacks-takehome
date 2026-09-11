# Storke reference review

Reference commit: `a65c379fed418a76b4de481ef96ba812844705d1`.
This is targeted source inspection, not a production security audit or a test run.

The principal developer confirms that the judging subsystem is known to be severely
broken and was not used in production. Its presence and tests are not evidence of
production reliability. Exclude it as an implementation reference for the new portal.

## What exists

Storke is a SvelteKit/TypeScript monolith with Better Auth, Drizzle/libsql, Tailwind,
AWS email and file storage, and Nix-based deployment. Its routes cover applicant
drafts and submission, administrative review, confirmation, attendance and meal
check-in, sponsor codes, analytics/exports, and project judging with audit/history.

Useful references include `src/routes/(portal)/+layout.svelte`, the sidebar in
`src/lib/components/sidebar/sidebar.svelte`, application validation in
`src/lib/schemas/application.ts`, and the applicant and administrative routes.
Domain tests already exist for validation, permissions, check-in, and judging.

## Differences from the assignment

The application model has one applicant form, not separate hacker and mentor
applications. Administrative application review records admission decisions but
does not provide rubric grades. Project judging scores are a different domain
and should not be repurposed as applicant grades.

## Concrete choices to revisit

- README mentions pnpm, but `justfile` invokes yarn and the repository contains
  `yarn.lock`. The new project should use one documented package manager.
- `application`, `confirmation`, and `checkIn` have globally unique user IDs
  despite carrying event columns. Several application/check-in queries omit
  event filters. The new project must use consistent event keys and event-scoped
  constraints to meet the user's explicit multiple-event requirement.
- Check-in and meal-ticket `checkerId` columns combine non-null constraints with
  `ON DELETE SET NULL`. Choose deletion semantics compatible with nullability.
- The application submission handler checks existing state before an unconditional
  update. Protect lifecycle transitions in the mutation to handle concurrent requests.
- `src/lib/permissions.ts` uses string-prefix route matching and permits accepted
  users on unrecognized routes. Explicit server permission checks are easier to
  reason about than implicit fallback access.
- `src/lib/server/judging/normalization.ts` maps a normalized zero to five. For raw
  scores 1, 2, and 10, that yields 5, 1.11, and 10: it reverses part of the ranking.
  This appears intentional in the reference, but is unsuitable as a default grading rule.
- Auth grants organizer access to verified `@sbhacks.com` addresses. That is a
  deployment-specific policy, not an appropriate policy to copy into this project.

No reference application files were changed and no production data was accessed.

## Visual reuse

The user's clarified instruction is to heavily mimic Storke wherever pages overlap.
`src/app.css` adopts its Source Serif 4 typography and stone light/dark color tokens.
`static/auth-splash.svg` copies Storke's `src/lib/assets/splash.svg` unchanged.
The auth layout follows `(auth)/+layout.svelte`: one-third illustration, two-thirds
form pane, a centered 448px form, and illustration hidden below 1024px. Login and
registration follow the corresponding Storke pages, including outlined alternate
actions, first/last name fields, and the functional remember-me checkbox.

The sidebar, mobile drawer, theme control, grouped application sections, boxed
review responses, and event timeline follow their Storke equivalents. Multi-event
selection, per-type applications, and decision releases retain their distinct
workflows. The provided Cal Hacks logo and Colmena name replace Storke branding.

Storke has two separate animations. `LoadingBar.svelte` matches its 150ms fly-in/out
and two-second progress bar, but starts without the original 200ms threshold.
The layout separately animates page content: 150ms upward exit, then 300ms entrance
from the left. It uses the Web Animations API through SvelteKit `onNavigate` to
sequence the page swap without mounting duplicate copies of forms. Cached routes
also animate. Reduced-motion mode skips movement and the page-swap delay.

The public landing header now follows Storke's regular content flow (no separate
navigation bar), with a 768px content width and a 32px gap before the event list.
The event banner stretches alongside the entire dated timeline, with 48px step
spacing. Application-type choices follow below because Colmena supports multiple
independent applications. Per-event decision, check-in, and opening-ceremony dates
replace Storke's hardcoded single-event schedule; planned dates do not trigger
admission publication.

The reporting follow-up adapts Storke's application-stats cards/distributions,
admin reviewer leaderboard (period tabs, ranked table, published outcome columns),
and data-warehouse export cards. It does not reuse the broken project judging
subsystem. Permissions are event-specific, leaderboard credit comes from completed
reviews, and latest released revisions avoid duplicate counts after promotions.
Exports deliberately omit auth data and private drafts. Resumes follow Storke's
upload/preview flow but use atomic SQLite storage instead of S3 presigned URLs.

The analytics layout now follows Storke's application-stats hierarchy: three-column
summary cards, a full-width status section, paired secondary distributions, and a
full-width ranked school/organization table. Submission dates also span the content
width. Status colors match Storke's emerald/rose/amber/blue/gray mapping; secondary
charts use blue, violet, and emerald. Bars show each category's share of the total,
with explicit counts and percentages, rather than scaling the largest bar to 100%.
Metric text colors have lighter dark-theme variants. Mobile charts stack vertically.

Applicant and organizer destinations now use Storke's persistent sidebar flow rather
than a second row of organizer buttons. Event selection is an explicit intervening
page when required by Colmena's multi-event model. The application-type cards are
shared between event information and My applications. Event creation is a collapsed
workspace action, keeping routine application/review navigation prominent.
