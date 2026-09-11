# Colmena · Cal Hacks Portal

A hackathon application portal for multiple events, with independent hacker and
mentor applications, organizer grading, waitlists, and explicit decision release.
Built as a SvelteKit/TypeScript monolith with SQLite, Better Auth, Drizzle, and a
Nix-built Docker/OCI image. Seeds use 2025 Cal Hacks event names and descriptions with open testing dates.

## Run locally

```sh
nix develop
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open **http://localhost:5173**. No AWS credentials or `.env` file are required.
Missing tools on NixOS are supplied by the development shell. Browser authentication
and editing require JavaScript; controls wait for initialization to avoid losing
input during hydration. Forms are validated and saved on the server.

Local demo accounts use **`CalHacks-demo-2026!`**:

| Email                   | Role                                                     |
| ----------------------- | -------------------------------------------------------- |
| `applicant@example.com` | Applicant with a published Fall hacker waitlist decision |
| `reviewer@example.com`  | Fall reviewer, with no Spring access                     |
| `manager@example.com`   | Event manager and local platform administrator           |

`DEMO_PASSWORD` overrides the password on first seed. Seeds preserve existing data
and refuse production mode. To register a new account locally, follow its verification
link in `data/outbox/*.json`. Password recovery uses the same local outbox. The
database, outbox, and generated local auth secret are ignored by Git.

## What works

- Database-managed events with independent schedules, memberships, and offered types.
- Separate hacker/mentor drafts and submissions for the same user and event.
- Version-checked saves, verified-email submission, deadlines, and archived history.
- Searchable, paginated organizer queues and private, rubric-based reviews.
- Expiring review claims with renewal, release, and revocation protection.
- Manager-prepared decisions, exact batch previews, and atomic, retry-safe publication.
- Waitlist promotion and corrected decisions that preserve the previous published
  result until another explicit release.
- Event/team administration, local email fallback, and documented live SES setup.

Reviewers cannot publish decisions. Organizers cannot review or decide their own
applications. Completed grades are immutable; admission corrections have a reason
and a separate decision revision. Waitlists are unranked, publication is manual,
and admission notifications are portal-only. Resume uploads, RSVP/capacity handling,
and automated ranking are intentionally outside scope.

## Verify

```sh
pnpm format:check
pnpm check
pnpm test
pnpm test:e2e
pnpm build
nix build .#docker-image -o result-image
podman load -i result-image
pnpm test:container
```

Browser tests use Nix's Chromium and their own synthetic database on port 5174;
they do not overwrite `data/portal.db`. Container tests use local network-disabled
containers and disposable volumes. CI performs these checks without publishing or
deploying the image. Actual SES delivery requires your credentials and is not
proven by mocked provider tests.

## Code map

| Location                            | Responsibility                                                 |
| ----------------------------------- | -------------------------------------------------------------- |
| `src/lib/domain/`                   | Versioned forms, rubrics, and explicit-offset date validation  |
| `src/lib/server/db/`                | Drizzle schema and lazy SQLite connection                      |
| `src/lib/server/portal.ts`          | Typed domain operations and transaction/permission boundaries  |
| `src/lib/server/auth.ts`, `mail.ts` | Better Auth and local/SES email adapter                        |
| `src/routes/events/`                | Applicant event directory and type-specific applications       |
| `src/routes/organizer/`             | Event management, grading, and decision publication            |
| `drizzle/`                          | Committed migrations; generate changes with `pnpm db:generate` |
| `tests/`, `e2e/`                    | Real-database domain tests and browser flows                   |
| `scripts/`, `flake.nix`             | Seeds, admin/backup tools, container packaging and smoke tests |

The domain module deliberately uses concrete operations rather than generic CRUD.
Reads build explicit applicant responses; writes acquire SQLite's immediate
transaction before checking current permissions, versions, and deadlines.

- [Agent/contributor rules](AGENTS.md)
- [Architecture and invariants](docs/architecture.md)
- [Requirements](docs/requirements.md)
- [Adversarial review](docs/adversarial-review.md)
- [Executed checks and verification limits](docs/verification.md)
- [Local and live email setup](docs/providers.md)
- [Nix/container operation and backup recovery](docs/deployment.md)
- [Three-minute demo script](docs/demo.md)
- [Branding provenance](docs/branding.md)

Storke supplies the shared visual design, color tokens, and authentication artwork.
Its production repository remains unchanged; no production data or judging code
was reused. See the
[reference review](docs/reference-review.md). **Production deployment is not performed
as part of this implementation**, per the user's instruction.

Applicants can upload a PDF resume (up to 2 MiB) and preview it before submission.
Reviewers see the submitted PDF alongside answers. Event organizers have application
analytics and a reviewer leaderboard; event managers can export CSV/JSON datasets
from Data warehouse. Resumes use SQLite storage and need no cloud credentials.
