# Authentication email and credentials

The portal sends verification and password-reset messages. Admission decisions are
published in the portal; they do not send email. File uploads and S3 are not used.

## Local development without credentials

Run `pnpm dev` with no `.env` file. SQLite uses `data/portal.db`, a random local
authentication secret is stored in `data/auth-secret`, and email is written to
`data/outbox/*.json`. The `data` directory is ignored by Git. Outbox messages contain
the destination, subject, plain-text body, and action URL. Open the newest JSON file
locally and follow its URL to verify your account or reset your password. These
files are private local development artifacts, not HTTP endpoints. File mode is 0600.

Copy `.env.example` to `.env` to change defaults. `pnpm dev`, `db:migrate`, `db:seed`,
`db:backup`, and `admin:grant` load it through Node's optional env-file support.
Exported environment values take precedence. Keep `BETTER_AUTH_URL` consistent with
the hostname you use in the browser (the default is `http://localhost:5173`).
In development, visits through another loopback hostname on the same port redirect
to that configured origin before showing a login form. Better Auth matches the
origin exactly; without this redirect, using `127.0.0.1` with a `localhost` setting
would make authentication endpoints return 404. Custom hostnames still require an
explicit `BETTER_AUTH_URL`; production origin checks remain unchanged.

Explicit `MAIL_MODE=ses` enables live sending locally. An SES error is returned as
a failure; it does not silently switch to the outbox. Production rejects outbox
mode and requires a configured sender/region and a strong authentication secret.
No provider request is made during the build or configuration validation.

## Create and verify a sender

Use an AWS account you control. In the SES console, choose a region, open
**Configuration → Identities → Create identity**, and choose an email address you
can verify or a domain whose DNS you control. For a domain, add the generated Easy
DKIM records at your DNS provider and wait for verified status. Use that same region
in `AWS_REGION` and a sender covered by the identity in `AWS_SES_FROM`; identity
verification is regional. See [AWS identity setup](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html).

New SES accounts may be sandboxed. For initial testing, verify your recipient too.
To allow arbitrary applicants, request production access in the SES account
dashboard for the sending region, describing transactional verification/recovery
mail and your intended handling of delivery issues. Check approval before inviting
public registrations. See [SES production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).

## Authorize the application

This application uses the AWS SDK's standard credential chain. On supported AWS
hosting, attach a role to the workload. For local use or a non-AWS host, create a
dedicated IAM identity with the policy below, then create an access key in its
security credentials area. Store the key ID and secret in runtime environment
variables; temporary credentials also need `AWS_SESSION_TOKEN`. Do not use the
account root credentials. See [AWS credential setup](https://docs.aws.amazon.com/sdkref/latest/guide/access-iam-users.html).

Example permission policy, substituting your region, account ID, and verified identity:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ses:SendEmail",
      "Resource": "arn:aws:ses:us-west-2:123456789012:identity/your-domain.example"
    }
  ]
}
```

The mail adapter uses `SendEmail`, not SMTP or raw-message sending. Restrict the
policy to your identity; the application does not need identity-administration
permissions. See [SES access controls](https://docs.aws.amazon.com/ses/latest/dg/control-user-access.html).

## Configuration reference

| Variable                                      | Local default / purpose                                            |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `DATABASE_PATH`                               | `./data/portal.db`; container uses `/data/portal.db`               |
| `BETTER_AUTH_URL`                             | `http://localhost:5173`; actual HTTPS public origin in production  |
| `BETTER_AUTH_SECRET`                          | Generated local secret; production requires at least 32 characters |
| `MAIL_MODE`                                   | `outbox` locally; production requires `ses`                        |
| `OUTBOX_DIR`                                  | `./data/outbox`; used only by local outbox mode                    |
| `AWS_REGION`                                  | Required for SES; must match the verified identity                 |
| `AWS_SES_FROM`                                | Required for SES; your verified sender email                       |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credentials for non-role setups                                    |
| `AWS_SESSION_TOKEN`                           | Required when using temporary AWS credentials                      |
| `AWS_PROFILE`                                 | Optional local SDK profile instead of environment keys             |
| `ORIGIN`                                      | Adapter-node's externally visible origin behind the reverse proxy  |
| `PORT`                                        | Container HTTP port, default 3000                                  |
| `MIGRATIONS_DIR`                              | Bundled automatically by the container runner                      |

Generate a production secret using `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`.
Use an env file outside the image or your host's secret manager. Never commit it.

## Verify the integration

With your live variables configured, start locally, register using an inbox you
control, follow the verification link, and submit an application. Then sign out,
request a password reset, and verify the new password works. Check that generated
links point to the origin you configured. Existing-account resend is available on
the applicant form. Confirm the sender's inbox/spam behavior before public use.

| Symptom                            | Check                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Credentials unavailable            | Credential variables, profile access, or workload role                        |
| Access denied                      | `ses:SendEmail`, identity ARN, and correct AWS account                        |
| Sender/recipient unverified        | Identity region, sender verification, and sandbox recipient restrictions      |
| Link points to localhost           | `BETTER_AUTH_URL`, then restart the process                                   |
| Origin/CSRF rejection              | Use the same browser origin as the configured URL; verify proxy configuration |
| Verification never arrives locally | Open `data/outbox`; local mode does not deliver external mail                 |
| Expired link                       | Request another verification/reset email                                      |

Automated tests exercise the real local outbox and simulated SES success/failure.
Actual AWS delivery requires your credentials and is not claimed as verified by
those tests. No live provider or production deployment is needed for local development.
