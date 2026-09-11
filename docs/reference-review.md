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
