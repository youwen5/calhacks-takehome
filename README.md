# Colmena (Cal Hacks Take Home Project)

A hackathon application portal for multiple events, with independent hacker and
mentor applications, organizer grading, waitlists, and explicit decision
release. Built as a SvelteKit/TypeScript monolith with SQLite, Better Auth,
Drizzle, and deployed via a Nix-built Docker/OCI image.

Deployed at <https://calhacks.youwen.dev>.

This demo is heavily inspired by <https://storke.sbhacks.com>, a full
production-grade hackathon logistics platform I was responsible for developing
last year as the Director of Development for SB Hacks XII, UC Santa Barbara's
annual hackathon. The UI and styling is copied over, and the demo features
are derived from Storke's features, but with many improvements based on things we
learned at the event as well as completely new technical wiring under the hood.
(I.e. the demo project itself is all new but some code snippets were copied
from Storke, especially UI components).

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

Local demo accounts use **`CalHacks-demo-2026!`** as the password:

| Email                   | Role                                                             |
| ----------------------- | ---------------------------------------------------------------- |
| `applicant@example.com` | Applicant with a published Fall hacker waitlist decision         |
| `jordan@example.com`    | Applicant with a published acceptance; use for event-day testing |
| `reviewer@example.com`  | Fall reviewer, with no Spring access                             |
| `manager@example.com`   | Event manager and local platform administrator                   |

`DEMO_PASSWORD` overrides the password on first seed. Seeds preserve existing data
and refuse production mode. To register a new account locally, follow its verification
link in `data/outbox/*.json`. Password recovery uses the same local outbox. The
database, outbox, and generated local auth secret are ignored by Git.

## Demo email verification

Unverified applicants can click **Bypass email verification (demo)** in the
application's verification banner. Logic for sending verification emails over
AWS SES exists internally (it's really easy to set up with better-auth) but I
didn't set up an AWS account for the project.

Also we store the PDFs directly in SQLite for this demo but in a real
production deployment they would obviously be in an S3 bucket (this is what we
did at SB Hacks last year).

The supplied VPS demo enables `DEMO_ACCOUNTS=true`: startup seeds the five accounts
shown in the landing-page banner, all using `CalHacks-demo-2026!`. It also creates
the two demo events. Subsequent starts preserve existing demo data. The shared
organizer account has administrative access; this deployment is a public sandbox.

Container releases are published to `ghcr.io/youwen5/calhacks-takehome` by the
manual **Publish container** workflow. Compose uses the published image; local
builds can override `PORTAL_IMAGE=localhost/calhacks-portal:local`. See the runbook
for registry access and digest-pinned updates.
