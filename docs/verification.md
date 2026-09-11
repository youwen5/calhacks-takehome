# Implementation verification

## September 11 UI and local sign-in update

Colmena replaces the shell wordmark and page-title suffix. The event-directory hero
and decorative taglines were removed, headings simplified, and explicit paragraph
and card spacing added. The delayed navigation bar follows Storke's behavior and
supports reduced motion.

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
