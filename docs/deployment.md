# Nix build and container operation

The requested implementation stops before production deployment. These are handoff
instructions; running the local build/smoke checks does not deploy the portal.

## Build

```sh
nix develop
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm test:e2e
nix build .#app
nix build .#docker-image -o result-image
podman load -i result-image
node scripts/container-smoke.mjs
```

Nix pins Node, the toolchain, and the pnpm dependency fetch. The fetch hash covers
the lockfile's dependency store. The sandboxed application build type-checks, tests,
builds SvelteKit's Node adapter, and bundles migration/admin/backup entry points.
No application database, secrets, or outbox is copied into the image.

After changing dependencies, update the lockfile, temporarily clear `pnpmDeps.hash`
in `flake.nix`, build, and replace it with the reported actual hash. New files must
be tracked with `git add` for a Git-backed flake to include them. Keep `flake.lock`
committed. The browser executable comes from the Nix development shell, avoiding
Playwright's incompatible generic Linux browser download on NixOS.

The smoke script runs temporary **local**, network-disabled containers with synthetic
configuration, checks HTTP startup and migrations, replaces the container while
retaining its volume, verifies backup integrity, and rejects production outbox mode.
It removes its own containers/volume afterward. `CONTAINER_ENGINE=docker` selects
Docker; Podman is the default. It never sends mail or exposes a public port.

## Runtime layout

| Component               | Location / behavior                                     |
| ----------------------- | ------------------------------------------------------- |
| Node monolith           | Built into the image; HTTP port 3000                    |
| SQLite                  | `/data/portal.db`, persistent local filesystem volume   |
| Migrations              | Bundled; run before HTTP startup; failure stops startup |
| Runtime user            | UID/GID `10001:10001`                                   |
| Administrative commands | `calhacks-admin`, `calhacks-backup` on PATH             |

The image contains its runtime and requires neither Nix nor package installation
on startup. Use one instance and local filesystem storage. Do not share its SQLite
volume among replicas or place it on network storage.

## Host setup when deployment is requested

1. Provide a Linux host with Docker/Podman, persistent disk, and a public domain.
2. Load the image locally or push it to a registry you control and adjust `compose.yaml`.
3. Create `portal-data` with ownership matching container UID 10001. On rootless
   Podman use `podman unshare chown 10001:10001 portal-data`; on rootful Docker,
   set host ownership appropriately. Keep this application volume private.
4. Configure the runtime variables in [providers.md](providers.md). The Compose
   example binds HTTP only to host loopback and does not mount the container socket.
5. Point DNS to the host and configure a host reverse proxy with HTTPS, forwarding
   to `127.0.0.1:3000`. Set both `ORIGIN` and `BETTER_AUTH_URL` to the actual HTTPS
   origin. Do not trust arbitrary client-supplied forwarding headers.
6. Start one container using the Compose file. Register/verify your account through
   the app, then run `podman exec <container> calhacks-admin you@your-domain.example`.
   Platform administrator rights allow event creation and manager provisioning;
   review and publication still require event membership and forbid self-decisions.
7. Create a hypothetical demo event and assign separate manager/reviewer accounts.
   Share only the intended event-scoped access with interview reviewers. The seed
   command refuses to run under `NODE_ENV=production`.

Example Caddy site (substitute your actual hostname):

```caddyfile
portal.your-domain.example {
  reverse_proxy 127.0.0.1:3000
}
```

## Backup, replacement, and recovery

Create a consistent backup with `podman exec <container> calhacks-backup /data/backup-YYYYMMDD.db`.
Use a new filename; existing backups are not overwritten. Copy the result to separate
storage and verify `PRAGMA integrity_check` using SQLite before relying on it.
Protect backups like the live database, since they contain account/application data.

Before replacing an image, take a backup, stop the old container, and start the new
one on the same volume. Brief downtime is intentional. Do not run competing instances
during migrations. Image rollback alone does not reverse a schema migration.

For an incompatible migration rollback, stop all app processes, preserve the failed
database and its WAL/SHM files, replace the live database with the pre-upgrade backup,
remove the old WAL/SHM from the live filename, restore ownership, and start the
matching old image. Never overwrite an active database. Test restoration on a separate
local volume first. The app will apply any migrations missing from the restored copy.

Readiness is checked by an HTTP request to `/events` after migrations; production
mail configuration is validated during server initialization. Mail credentials are
resolved when sending, so configuration validation does not prove AWS delivery.
