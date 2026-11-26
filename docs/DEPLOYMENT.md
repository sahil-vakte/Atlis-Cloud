# Production deployment

The application is served at `https://atlis.cloud` by Nginx, which proxies to the Next.js service on `127.0.0.1:3000`. HTTP requests and `www.atlis.cloud` redirect to the canonical HTTPS domain.

- App: `/opt/atlis-next/current` (symlink to a commit-specific release)
- Runtime: `/opt/atlis-runtime/node` (Node 22, separate from the legacy Node 14 installation)
- Service: `atlis-next.service`, running as `atlisapp`
- Configuration: `/etc/atlis-cloud.env`, outside the repository
- Database: existing `atlis`, accessed through a dedicated database-scoped account
- Uploads: `/var/lib/atlis-next/uploads`; legacy upload copy: `/var/lib/atlis-next/legacy-uploads`
- Pre-deployment backup: `/var/backups/atlis-cloud/`

The old Laravel directory and `atlis_new` database are preserved. Schema migrations are additive except for migration 001's app-owned dropdown seed normalization. Migration checksums prevent silently changing an applied migration. A failed app health check restores the previous release when one exists; database migrations are not rolled back automatically.

## Continuous integration and deployment

`.github/workflows/deploy.yml` validates pull requests and pushes to `main` with Node 22, dependency installation, email-routing tests, and a production build. Successful main-branch runs upload the exact source revision over SSH and invoke the root-owned `/usr/local/bin/atlis-deploy` helper as `atlisdeploy`. The helper installs dependencies, runs migrations and recipient discovery, regenerates schema metadata, builds, switches the current release, restarts the app, and checks database-backed health.

Required GitHub Actions secrets: `ATLIS_DEPLOY_KEY` and `ATLIS_KNOWN_HOSTS`. The dedicated SSH key cannot forward ports or allocate a terminal. The deployment account's only passwordless sudo command is restarting `atlis-next.service`.

Changes to `deploy/deploy.sh` require installing the reviewed version to `/usr/local/bin/atlis-deploy` separately; the running pipeline cannot overwrite that root-owned helper.

## Notification administration

Open **Administration → Notification emails**. Each historical address displays its original purpose, an editable replacement destination, and an enable switch. General registration and reminder inboxes and per-entity overrides are editable on the same page. Discovery reads existing recipient fields without changing users' login addresses or historical business records.

All To, CC and BCC addresses pass through the routing policy. Legacy company addresses without an enabled replacement are suppressed. Replacement destinations cannot point back to those legacy domains. No email is sent by viewing or saving this screen.

Sending requires all three conditions: `EMAIL_DELIVERY_ENABLED=true` on the server, configured environment SMTP settings, and the admin delivery switch enabled. Deployment starts with sending disabled. Legacy database SMTP accounts are not automatically activated.

## Operations

```sh
systemctl status atlis-next
journalctl -u atlis-next -n 100 --no-pager
curl --fail http://127.0.0.1:3000/api/health
```

Certificates for `atlis.cloud` and `www.atlis.cloud` are managed by Certbot. `certbot-renew.timer` renews them automatically; the deploy hook validates and reloads Nginx. HTTP ACME challenges are served from `/usr/share/nginx/html`.

## Legacy CV storage

The server's local S3 backup is connected through `LEGACY_CV_BACKUP_DIR=/s3/candidates.resume` (24 November 2026). It contains `<profile ID>/<filename>` paths and is checked before cloud access. The application reads these files in place, after record authorization; no AWS credentials or public static-file route are needed. Keep the backup readable by `atlisapp` and outside the web root.

Local CVs are resolved from `UPLOAD_DIR` and `LEGACY_UPLOAD_DIR`. The former Laravel production application also stored CVs in S3 under `<profile ID>/<filename>`; copying the local uploads folder does not include those objects.

To restore access, configure `LEGACY_CV_S3_BUCKET`, `AWS_REGION`, and valid AWS read credentials in `/etc/atlis-cloud.env` (or another AWS default-chain provider accessible to `atlisapp`). Restrict access to `s3:GetObject` for the CV bucket/prefix, with KMS decrypt permission only if those objects require it. Restart the application after updating configuration. Do not commit credentials. The previous Laravel key returned `InvalidAccessKeyId` during verification on 22 November 2026 and must be replaced by the bucket owner.

The application checks record permissions before reading cloud CVs, caches fetched files privately in `UPLOAD_DIR/legacy-cv-cache`, and never exposes credentials or signed storage URLs to the browser. Fetches incur normal S3 request/data-transfer charges; cached reads stay local. Validate a known object such as `136264/MuraliKrishnaRaoPodishetti.pdf` after access is restored. A missing object requires the original file or backup; a database filename alone cannot recreate the CV.

Notification emails also controls the sender address and display name. Legacy contact references in email templates use the same replacement rules as To/CC/BCC. AC entity codes replace the old TQ codes consistently in entity settings and reminder mappings; original email addresses are retained only as routing references.
