# Three-minute walkthrough

Run `pnpm db:seed` and `pnpm dev`. Use separate browser profiles/private windows
for applicant, reviewer, and manager so sessions do not overwrite one another.

Local-only accounts use password `CalHacks-demo-2026!` unless `DEMO_PASSWORD` was set
when first seeding. Re-running seeds preserves existing accounts and event dates.

| Account                 | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `applicant@example.com` | Returning applicant with a published hacker waitlist decision |
| `reviewer@example.com`  | Reviewer for Fall only; no Spring access                      |
| `manager@example.com`   | Event manager plus platform administrator for the local demo  |

1. **0:00–0:35 — Events and application types.** Open the event directory. Show two
   events sharing one login. Open Fall and point out independent hacker and mentor
   application cards. The existing applicant can view their hacker waitlist and
   start a mentor draft without overwriting it.
2. **0:35–1:10 — Applicant flow.** Show draft saving, type-specific questions, and
   submitted answers locking. A new account verifies through the local outbox;
   explain that live mode sends through SES. Do not show actual tokens in recordings.
3. **1:10–1:50 — Organizer review.** As reviewer, filter the Fall queue and open
   Morgan Lee's unreviewed application. Claim it, score three anchored criteria,
   add notes, and complete the review. Explain that notes/grades are private and
   completion is separate from admission.
4. **1:50–2:30 — Gated release.** As manager, prepare an acceptance or waitlist.
   Show that the applicant still sees submitted. Select the revision in Decision
   releases, inspect the exact preview, and publish. Refresh the applicant view.
   Mention that a waitlist promotion uses another prepared/published revision.
5. **2:30–3:00 — Organization and architecture.** Show event settings and offered
   types; a new event needs no deployment. Briefly explain the single Node/SQLite
   container, event memberships, and all-or-nothing release transaction. Point to
   the README for setup and verification commands.

The recording and interview submission are user deliverables; this repository
provides the script but does not record or submit on the user's behalf.
