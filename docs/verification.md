# Implementation verification

## September 11 Storke design alignment

The shared UI now follows Storke directly: bundled Source Serif 4, its stone
light/dark tokens and auth illustration, the split-screen login/register layout,
40px controls, first/last name registration, functional remember-me option,
sidebar/mobile drawer, grouped application sections, boxed review responses,
and event timeline. The Colmena wordmark and Cal Hacks event branding remain.

The page content now animates separately from the loading bar. SvelteKit waits for
the 150ms outgoing content animation before swapping pages, then the new content
enters over 300ms. There is no 200ms loading-bar threshold. Reduced-motion mode
skips page movement and the artificial page-swap wait. This supersedes the earlier
loading-bar-only approach below.

Executed checks: nine Chromium tests passed, including content motion in both
preferences, font/theme persistence, responsive auth, and the existing complete
application/review/release flows. All 24 database/auth tests, type checking, and
the production application build passed. Browser inspection confirmed Source Serif 4
loaded, the exact light background `rgb(245,245,244)` and text `rgb(28,25,23)`,
working local manager sign-in, and no registration overflow at 390px. Login,
registration, organizer queue, light/dark, and mobile screenshots were inspected.
The historical container image has not been rebuilt for these UI changes.

## September 11 UI and local sign-in update

Colmena replaces the shell wordmark and page-title suffix. The event-directory hero
and decorative taglines were removed, headings simplified, and explicit paragraph
and card spacing added. The initial follow-up animated only the loading bar;
the Storke alignment above replaces that with actual page-content transitions.

Local browser visits through a loopback alias redirect to the configured auth
origin; production origin enforcement is unchanged. Vite ignores generated data,
test artifacts, and documentation, and Tailwind scans only `src`, preventing unrelated
file writes from clearing an in-progress form through a development reload.

Verification: six Chromium flows passed, including the new loopback redirect,
runtime-write/input-preservation, and delayed-navigation checks. All three actual
local demo accounts also signed in successfully through the browser. The 24
database/auth tests passed, type checks reported zero errors/warnings, and the
production application build passed. Desktop and 390px mobile layouts were inspected.
The container image was not rebuilt for this UI update; the image below is historical.

## Initial implementation baseline

Verified locally on September 10, 2026, on x86_64 Linux/NixOS. This record describes
executed checks, not only the intended design. Production deployment is explicitly
excluded from the current task.

## Results

| Check                                                   | Observed result                                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm format:check`                                     | Passed                                                                                                                               |
| `pnpm check`                                            | Zero errors and warnings                                                                                                             |
| `pnpm test`                                             | 24 tests passed across four files                                                                                                    |
| `pnpm test:e2e`                                         | Five Chromium browser flows passed, without test retries                                                                             |
| `pnpm db:generate`                                      | No schema drift after generating migration 0001                                                                                      |
| `pnpm db:migrate`                                       | Existing synthetic database upgraded; eight applications and four reviews retained; integrity OK and no foreign-key violations       |
| `nix build .#docker-image -o result-image`              | Built the application and OCI image, including sandboxed type checks, domain tests, and the production SvelteKit build               |
| `podman load -i result-image` and `pnpm test:container` | Passed fresh startup, container replacement, online backup, restoration, migration-failure shutdown, and production outbox rejection |

The September 10 runtime image is `/nix/store/01blfr38ynbzwsa1wg8hp49m61q7vjdm-calhacks-portal.tar.gz`.
This is the initial implementation baseline, not an image of subsequent UI changes.

## Requirement evidence

| Requirement / invariant                        | Evidence                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authentication and database-backed submissions | Browser registration, local verification, save/reload, submission, sign-in, and password-reset flows; real Better Auth failure/recovery tests                                                                                                    |
| Independent hacker and mentor applications     | One browser account submits both; domain tests also apply at another event and reject cross-event organizer access                                                                                                                               |
| Multiple events without redeployment           | Browser creates an event, offers both types, publishes it, and assigns a reviewer; domain tests cover unpublished events, memberships, archival, and deadlines                                                                                   |
| Review and grading                             | Browser claims and completes a three-criterion review; domain tests enforce integer score bounds, completion, immutable completed reviews, and revoked/expired claims                                                                            |
| Organizer list and statuses                    | Browser searches/filters the queue and opens its submitted application; queue code bounds pages and exposes draft metadata without draft answers                                                                                                 |
| Gated release and waitlists                    | Browser observes submitted → published waitlist → published acceptance, with the prior status retained during preparation; mentor status remains independent                                                                                     |
| Atomic, retry-safe decisions                   | Database tests reject entire stale batches, reject overlapping releases, replay successful release IDs, and deny self-decision/mixed owned batches                                                                                               |
| Real contention and input preservation         | Independent processes compete behind a held SQLite lock for draft creation and claims; exactly one wins. A separate lock crosses the deadline. Two browser tabs demonstrate that stale input remains visible without overwriting the saved draft |
| Privacy and authorization                      | Explicit applicant-response tests exclude grades/notes/prepared decisions; browser checks private notes and unauthorized organizer access; server reads and mutations check event membership and ownership                                       |
| Credential-free development                    | Real private local outbox tests and browser verification/reset; mocked SES tests prove configured failures do not silently fall back                                                                                                             |
| Persistent self-contained container            | Network-disabled local container starts its bundled runtime/migrations; submitted synthetic application and typed answers survive replacement and backup restoration                                                                             |
| Cal Hacks branding and usable layout           | Supplied favicon, Cal Hacks page/email copy, inspected mobile rendering, browser overflow assertion at 390px, labeled form controls and skip navigation                                                                                          |
| Explainable handoff                            | README commands, AGENTS.md rules, architecture, provider credential guide, deployment/recovery guide, and three-minute demo script                                                                                                               |

The reference Storke repository remains unchanged. No production database, applicant
records, credentials, or judging subsystem were imported.

## Boundaries

- Actual AWS delivery is untested without live credentials. The setup and manual
  verification procedure are in [providers.md](providers.md).
- No production service, public URL, registry push, remote CI run, recording, or
  interview submission was performed. Public deployment and submission materials
  remain assignment deliverables outside this implementation run.
- Only x86_64 and Chromium were exercised. The Nix configuration also declares
  aarch64; that platform and other browser engines are not verified here.
- This is a functional miniature, not a measured capacity claim for tens of
  thousands of concurrent applicants. There is one writer instance, bounded queues,
  and at most 500 decisions in a release.
- Version 1 is the only shipped form/rubric version. Published versions are pinned
  and looked up explicitly; adding a future version must preserve the existing
  definitions and add upgrade coverage. A future deployment was not simulated by
  claiming an unimplemented version exists.

## Signed-out layout and event schedule follow-up — September 11, 2026

- Type checking: zero errors/warnings. Production build passed.
- Vitest: 26 tests passed, including milestone order, event isolation, manager-only
  configuration, and prepared decisions remaining private after the scheduled date.
- Playwright: 10 tests passed. New coverage checks the in-flow public header,
  all three dated milestones, desktop banner height, and mobile stacking/overflow.
  Existing auth, application, release, and reduced-motion transition checks pass.
- Visually inspected desktop landing/event pages and the 390px mobile event page
  against Storke's content flow. The development server serves these changes at
  http://localhost:5173.
- Backed up local SQLite before applying migration 0002. Integrity check passed,
  foreign-key check returned no violations, and counts remained 2 events,
  8 applications, and 4 reviews. Existing rows use documented schedule defaults.
- Formatting and git whitespace checks passed. No production deployment or new
  container image build was performed for this follow-up.

## UI cleanup, resumes, and organizer reports — September 11, 2026

- 33 Vitest tests pass, including PDF validation/size, atomic replacement/removal,
  private draft files, immutable submitted files, event/role isolation, streamed
  body limits, latest-publication aggregation, event-timezone leaderboard periods,
  export permissions, private draft exclusion, and CSV formula protection.
- 12 Playwright tests pass. The applicant-to-organizer flow uploads a real PDF,
  checks byte-for-byte download preservation, and verifies the embedded reviewer
  preview and cross-event denial. Added checks cover badge/title alignment,
  filter/button alignment, analytics, reviewer ranking, and CSV/JSON downloads.
- Type checking reports zero errors/warnings. Production build passes. Visually
  inspected PDF rendering (fit-width, thumbnail pane hidden), analytics, leaderboard,
  export cards, and mobile analytics with no horizontal overflow or browser errors.
- Nix image build passes, including its isolated 33-test run:
  `/nix/store/p1ygin7x1w456gix5hfjf43l0iypagl5-calhacks-portal.tar.gz`.
  The build initially exposed an Undici outbound FormData cancellation race in a
  test fixture; the fixture now models received encoded bytes. No tests were skipped.
- Loaded the image locally with Podman and passed the network-disabled container
  smoke: migrations, HTTP, application/PDF persistence across replacement, SQLite
  backup restoration including PDF bytes, fail-closed migration startup, and the
  production email guard. This was not a production deployment.
- Local database backup preceded migration 0003. Integrity/foreign-key checks pass;
  the existing eight applications remain intact. Event names/descriptions/venues
  were updated through versioned event configuration; existing dates stay open for
  testing. The live development events page returned HTTP 200 on port 5173.
- Formatting and git whitespace checks pass. Updated architecture, source attribution,
  environment setup, deployment notes, and AGENTS.md document the expanded scope.

## Analytics layout and sidebar navigation follow-up

- Analytics now follows Storke's three-column summary, full-width colored status
  section, paired secondary charts, and full-width ranked organization table.
  Browser measurements confirm the status section spans the content width;
  visually inspected light/dark themes and mobile layout without page overflow.
- Applicant and organizer links moved into the sidebar, with allowlisted event
  selection and event-preserving section changes. Event creation stays collapsed
  behind its workspace button. Sidebar links measure at least 36px high with 4px
  gaps; navigation scrolls rather than compressing on mobile.
- Type checking reports zero errors/warnings and the production build passes.
  The expanded browser run passed 13 of 14 cases and exposed a fast-click event
  transition race. Links now become inert during navigation; both targeted sidebar
  cases pass after the fix, including mobile navigation and invalid destinations.
  Existing upload, review, release, auth, analytics/export, and event creation flows
  passed in the full run. No tests were skipped to address the failure.
- Source reuse and URL-based navigation decisions are documented in architecture,
  reference-review, and AGENTS.md. This UI follow-up does not rebuild the OCI image;
  the previously recorded image predates these layout/navigation changes.

## Attendance page and status gates

The complete browser suite passes all 18 cases, including the full hacker form,
autosave with edits during a pending save, PDF upload/review, demo verification,
attendance confirmation, QR check-in, meals, sponsor redemption, and denial of
unaccepted users at all three event-day page URLs. All 45 unit tests pass; they
also cover revoking acceptance after check-in and rejecting further meal/code use.
Type checking reports zero errors/warnings and the production build passes.
The event pass retains its 320px maximum width, per the user's correction.
The running development server is available at http://localhost:5173.
This follow-up does not rebuild or deploy the OCI image.

## Email-free VPS deployment and public demo banner

The Nix-built image targets the configured HTTPS origin `https://calhacks.youwen.dev`.
The latest image was loaded into Podman and passed the network-disabled container
smoke: production registration, demo verification, disabled password reset,
migration failure handling, application/profile/PDF/event-day persistence, and
backup restoration. The checked-in Compose file passed a separate isolated-project
smoke with loopback HTTP, healthcheck, all five advertised demo logins, named-volume
persistence, and forced container replacement. The smoke honors auth rate limits
when switching rapidly between accounts. All temporary containers/volumes were
removed.

47 unit tests pass. The full 18-case browser suite passed after the email-disabled
changes; the four relevant landing/sidebar/mobile cases passed again after adding
the banner. Live development browser checks showed five accounts and no horizontal
overflow at 1440px and 390px. The Nix build performs type checking, unit tests, and
the production build. No VPS connection or public deployment was performed: the
public hostname is configured, but an SSH target/access was not supplied.

## Published GHCR image

Source commit `18304e98d3007b36a2592c4af5c49c1a5bd53c6d` was built locally with
Nix and published by [Publish container](https://github.com/youwen5/calhacks-takehome/actions/runs/34664895670).
The workflow rebuilt the image, ran both container and Compose smoke checks,
pushed commit and latest tags, and pulled the resulting digest back from GHCR.
The anonymous registry manifest returned HTTP 200 with the expected digest;
Compose now pins that digest. A local Podman pull with an empty authentication
file also succeeded. No registry credentials are required to pull it.
The subsequent Compose/documentation pin does not change application code.

```text
ghcr.io/youwen5/calhacks-takehome@sha256:91b56e3896375630d28b1b9aacdfd133d7582ec7ad3ed06f8d466d6461a72e6e
```
