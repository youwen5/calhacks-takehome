# VPS deployment with Nix and Compose

Target: **https://calhacks.youwen.dev**. The deployment is a single Node monolith,
built by Nix and run with Podman or Docker. SQLite stores accounts, applications,
PDF resumes, attendance, meals, and sponsor codes in one persistent volume.
No SES, S3, cloud keys, external database, or email service is needed.

## Email-free demo behavior

Compose explicitly sets `MAIL_MODE=disabled` and `DEMO_EMAIL_VERIFICATION=true`.
Registration/sign-in work without attempting email delivery. Applicants use the
verification-bypass button on their application to submit. This does not prove
mailbox ownership. Password-reset delivery and verification resend are disabled;
the UI explains the limitation instead of claiming an email was sent. Keep your
account password. The local development outbox remains development-only, never a
public endpoint. Optional real email configuration remains in [providers.md](providers.md).

## Build and load the image

Build on Linux with Nix flakes enabled, using the VPS CPU architecture. The flake
supports x86_64-linux and aarch64-linux. A build on x86_64 is not an ARM image;
build on the ARM VPS or configure a matching Nix builder for ARM.

```sh
nix build .#docker-image -o result-image
podman load -i result-image
podman tag calhacks-portal:local localhost/calhacks-portal:local
nix develop --command node scripts/container-smoke.mjs
```

The Nix build type-checks, runs unit tests, builds SvelteKit's Node adapter, and
bundles migration/admin/backup commands with Node and native SQLite dependencies.
At runtime Nix is not required inside the image. No Dockerfile/npm install at
startup is needed: Compose runs the Nix-built image, with `pull_policy: never`.

For a Git-backed flake, new source files must be tracked with `git add` before
building. Commit the lockfile. Dependency changes may require updating
`pnpmDeps.hash` in `flake.nix` using the actual hash reported by Nix.

If building elsewhere, copy the image bytes (not just the result symlink):

```sh
cp --dereference result-image colmena-image.tar.gz
scp colmena-image.tar.gz YOUR_VPS:~/colmena-image.tar.gz
```

Load it on the VPS with `podman load -i ~/colmena-image.tar.gz`, then apply the tag
above. Replace `YOUR_VPS` with your SSH target. Transfer the Compose file and
`deploy/` examples too, or check out this project on the VPS. Docker users can
substitute `docker` for `podman`, including the explicit localhost image tag;
use `CONTAINER_ENGINE=docker` for the smoke script.

The smoke test uses disposable, network-disabled containers and synthetic accounts.
It exercises startup, migrations, registration without mail, demo verification,
disabled password reset, persistent application/profile/PDF/event-day data,
backup restoration, migration failure, and rejection of a production outbox.
It never deploys a public service.

## Configure the VPS

1. Install Podman and a Compose provider, or Docker with its Compose plugin.
   `podman compose version` must work. Podman delegates Compose to an external
   provider such as `podman-compose`; install both commands on the host, not just
   in a temporary shell used for setup. On NixOS, include `pkgs.podman-compose`
   in system packages and enable Podman. See the official
   [Podman Compose documentation](https://docs.podman.io/en/latest/markdown/podman-compose.1.html).
2. Keep the deployment in a stable directory, e.g. `~/colmena`, containing
   `compose.yaml` and `deploy/`. The Compose project name is fixed as `colmena`.
3. Create the private runtime configuration:

```sh
cd ~/colmena
cp deploy/production.env.example .env.production
chmod 600 .env.production
openssl rand -hex 48
```

Put the generated value in `BETTER_AUTH_SECRET` in `.env.production`. Its URL is
already `https://calhacks.youwen.dev`. Never commit this file or put it in an image.
Keep the secret stable across container replacements. `.env.production` is passed
explicitly so local-development `.env` values do not accidentally configure the VPS.

4. Point the domain's DNS A record to the VPS IPv4 address. Add AAAA only if the VPS
   actually serves IPv6. Allow inbound TCP 80/443 for HTTPS; keep Node port 3000
   private. Configure a host Caddy reverse proxy using
   [deploy/Caddyfile.example](../deploy/Caddyfile.example):

```caddyfile
calhacks.youwen.dev {
  reverse_proxy 127.0.0.1:3000
}
```

Caddy runs on the host, separately from this one-service Compose deployment. The
application publishes only `127.0.0.1:3000`; a proxy running in a different container
would need its own networking setup. Both application `ORIGIN` and
`BETTER_AUTH_URL` are derived from the configured public HTTPS origin. No arbitrary
forwarded-host headers are trusted. Keep any proxy upload limit at least 2,162,688
bytes (2 MiB PDF plus 64 KiB form overhead).

5. Start and check the portal:

```sh
podman compose --env-file .env.production up -d
podman compose --env-file .env.production ps
podman compose --env-file .env.production logs --tail=100 portal
curl -f https://calhacks.youwen.dev/events
```

The service healthcheck requests `/events` after migrations. A container healthcheck
indicates readiness; it is not an automatic repair mechanism. Check logs when it
becomes unhealthy. See [Compose service configuration](https://docs.docker.com/reference/compose-file/services/).

## Data and first administrator

The named volume **`colmena_portal-data`** is mounted at `/data` and survives container
replacement. The image runs as UID/GID `10001:10001`; its `/data` directory is
initialized for this user, so a fresh named volume needs no host bind-directory
chown. Never use `compose down -v` on a live deployment: that deletes its database.
Use one instance on local filesystem storage; do not share this volume across
replicas or network filesystems.

Migrations run before HTTP starts and stop startup if they fail. Secrets and
runtime data are excluded from the image. Production does not seed demo passwords
or overwrite local data. For a fresh deployment:

1. Register your account through the public site.
2. Open an application and click **Bypass email verification (demo)**. If there
   are no published events yet, use the same authenticated demo endpoint from the
   browser console on this origin:

```js
await fetch('/api/demo/verify-email', { method: 'POST' }).then((r) => r.json());
```

3. Grant the account platform administration:

```sh
podman compose --env-file .env.production exec portal calhacks-admin YOUR_EMAIL
```

4. Sign in again or refresh, open **Manage events**, and create/publish an event.
   Assign event manager/reviewer memberships explicitly. Platform administration
   alone does not grant permission to review or publish decisions.

An existing database can be transferred only via a SQLite-aware backup, with the
new service stopped. The instructions here initialize a fresh deployment; they do
not automatically copy local test accounts or data to the VPS.

## Start after a reboot

`restart: unless-stopped` handles process exits while the container engine runs.
For rootless Podman, also enable a persistent user service:

```sh
mkdir -p ~/.config/systemd/user
cp deploy/colmena.service.example ~/.config/systemd/user/colmena.service
systemctl --user daemon-reload
systemctl --user enable --now colmena.service
sudo loginctl enable-linger "$USER"
```

The example expects the deployment in `~/colmena` and Podman plus its Compose
provider in the host system PATH. Adjust the unit for a different directory or
installation. For rootful Docker, enable the Docker daemon at boot; the Compose
restart policy then applies. Do not run the Podman user unit against Docker.

## Backups, updates, and rollback

Create a consistent backup through the included SQLite backup command, using a new
filename every time. Copy it off the VPS and protect it like the live database:

```sh
podman compose --env-file .env.production exec portal calhacks-backup /data/backup-2026-09-11.db
podman cp "$(podman compose --env-file .env.production ps -q portal)":/data/backup-2026-09-11.db ./backup-2026-09-11.db
sqlite3 backup-2026-09-11.db 'PRAGMA integrity_check;'
```

Expected output is `ok`. PDFs are included; budget up to 2 MiB per resume plus
application data. Never copy an active SQLite file alone and omit its WAL.

For an update: create a backup, retain/tag the old image, build/load the new image,
then stop the service before recreating it on the same volume:

```sh
podman compose --env-file .env.production stop portal
podman compose --env-file .env.production up -d --force-recreate portal
```

Expect brief downtime. Do not overlap two writers during migration. Changing the
image does not undo schema changes. For an incompatible rollback, stop the service,
preserve the failed database and WAL/SHM files, restore the backup to `/data/portal.db`,
remove stale WAL/SHM files for that filename, restore container-user ownership,
and start the matching old image. Verify restoration on a separate local volume
before using this procedure against live data.
