# Requirements

Source: user-provided prompt and the [full assignment](https://app.notion.com/p/calhacks/Cal-Hacks-FA26-Tech-Team-Take-Home-Project-e118573481db83b4b62d01bd222b17ef), read September 10, 2026.

## Required deliverables

| Requirement                                             | Proposed implementation                                                                | Acceptance evidence                                                                                                          |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Sign-in and persistent applications                     | Session authentication and a real SQL database                                         | Register/sign in, save, reload, and find persisted data                                                                      |
| At least two account types with distinct applications   | Selectable hacker and mentor applications per event                                    | One user can maintain both independently, each with its own questions, validation, review, and decision                      |
| Organizer review and grading                            | Application detail with rubric, notes, and decisions                                   | Authorized organizer records grades; applicant cannot mutate them                                                            |
| Waitlists and gated decision release (user requirement) | Manager-prepared decisions, explicit batch publication, and waitlist promotion         | Staged decisions stay private; published waitlist status remains until a promotion is released                               |
| List all applications and statuses                      | Organizer list with pagination, search, and filters                                    | Submitted applications appear and decisions update their status                                                              |
| Additional useful feature                               | Multiple-event management; claimable review queue as a further enhancement             | Events run independently; review claims prevent simultaneous ownership                                                       |
| Public deployment                                       | One deployed full-stack service and persistent database                                | Applicant and organizer flows work at a public URL                                                                           |
| Multiple events (user requirement)                      | Database-backed events, event URLs, event management, and scoped organizer memberships | Create another event without redeploying; the same account applies independently; organizers cannot access unassigned events |

Evaluation emphasizes end-to-end functionality, readable code and suitable data
modeling, intentional visual design, and a useful additional feature. The user must
be able to explain every submitted line.

## Submission details from the full assignment

The page states a September 11 deadline at 5:00 PM, labeled PST. Preserve this wording;
do not silently reinterpret its timezone. Submission needs a GitHub repository URL,
a deployed URL, a walkthrough recording of at most three minutes, and short written
responses. Recording and submission are outstanding user-facing deliverables.

Next.js, TypeScript, Tailwind, Supabase, and Vercel are suggestions, not requirements.

## Proposed boundaries

Support multiple events in one deployment, with shared accounts and independent
applications, deadlines, statuses, and organizer permissions. Support hacker and
mentor application types selected from those offered by the event. Allow one
application per account per event per type, including both types in the same event;
organizer access is independently provisioned per event.
Draft saving is baseline usability. Event-day logistics, meals, sponsorship,
project judging and score normalization are outside scope. The follow-up adds PDF
resumes, application analytics, a reviewer leaderboard, and CSV/JSON exports.

Use sourced 2025 Cal Hacks event names and descriptions with open testing dates,
as explicitly requested in the follow-up.

## Implementation sequence

1. Establish the SvelteKit/SQLite monolith, Nix-built container, migrations, authentication, and local email outbox; verify container persistence early.
2. Build event management/memberships and two synthetic seed events.
3. Deliver event selection, registration, applicant type selection, draft saving, and submission.
4. Deliver organizer listing and rubric grading with review claims, concurrency protection, notes, and clear UI states.
5. Deliver staged decisions, waitlists, and explicit publication.
6. Polish responsive design and verify the complete flows, event isolation, deadlines, decision visibility, and authorization.
7. Prepare and locally verify the deployment image, persistence, and both roles; document a short demo script. Public deployment remains an assignment deliverable, but is excluded from the current implementation instruction.

SQLite and a Nix-built Docker/OCI container running a single Node monolith are selected.
Hosting access, public domain, and registry remain unresolved. The implementation
defaults to SvelteKit and hacker/mentor types, with independent applications per user,
event, and type. Managers publish decisions; reviewers grade them.

## Final review acceptance gates

The final architecture contract and `adversarial-review.md` specify mandatory
ownership, event/type isolation, release replay/conflict, deadline, and deployment
checks. No release may contain the acting manager's own application. No unpublished
decision or internal review data may appear in applicant responses. Failed batch
validation publishes nothing; retrying a committed release returns its original result.

Initial waitlists are unranked and manually managed. Releases are manual batches
of at most 500 decisions; applicants check the portal for results. Admission emails,
scheduled releases, RSVP/capacity management, and editable completed reviews are
outside this version. Authentication verification/recovery email remains required.
