# atlis.cloud

Recruitment, PS Care (consultant care) and CRM platform — the Next.js rebuild of the former TAMIS Laravel + Vue (CoreUI) application, rebranded as **atlis.cloud**.

- **Next.js 14** (App Router, TypeScript, Tailwind) — one app for the UI and the API
- Works on your **existing MySQL / MariaDB database** (same 133 tables, plus 3 small new ones)
- **Your existing users keep their passwords** (Laravel bcrypt hashes are read as-is)
- **In-house CV parser**: no external parsing service, no API key, no per-CV cost
- Menus, permissions, dropdowns, branding, reminder schedules and email recipients all come from the **database**

---

## 1. Quick start

Requirements: **Node.js 18.18+** (20 or 22 recommended) and **MySQL 8 / MariaDB 10.5+**.

```bash
# 1  Database — EITHER import the ready-made, rebranded copy:
mysql -u root -p -e "CREATE DATABASE atlis CHARACTER SET utf8mb4"
mysql -u root -p atlis < database/atlis_cloud.sql
#    OR keep your current database and upgrade it in place (safe to re-run):
#    mysql -u root -p yourdb < database/001_atlis_cloud.sql
#    npm run rebrand-db            # dry run: shows what Tamis → atlis.cloud would change
#    npm run rebrand-db -- --apply

# 2  Configuration
cp .env.example .env.local        # then fill in DB_*, JWT_SECRET, APP_URL, SMTP_*, CRON_SECRET

# 3  Install, build, run
npm ci
npm run build
npm start                         # http://localhost:3000
```

Sign in with any existing account. `/careers` is the public job board.

### Keep existing files working
Old CVs, contracts, timesheets and documents live in the Laravel app's `public/uploads` folder. Copy that folder to `storage/legacy-uploads` (or set `LEGACY_UPLOAD_DIR` to its path). New uploads go to `UPLOAD_DIR` (default `storage/uploads`). Files are always served through an access check, so consultants and companies can only open their own.

### Scheduled reminders
Run once a day (cron, a scheduler or an uptime monitor):

```bash
curl -H "x-cron-key: $CRON_SECRET" https://your-host/api/cron/all
```

| Job | What it does | Configure in |
|---|---|---|
| `contract-expiry` | Emails the entity's inbox 45/30/15 days before a contract ends | Settings `contract_reminder_days`, Dropdown options → `entity_reminder_email` |
| `po-expiry` | Same for purchase orders | `po_reminder_days` |
| `timesheet-reminder` | Reminds consultants who haven't submitted last month's timesheet (days 1, 3, 5) | `timesheet_reminder_days` |
| `no-due-consent` | First day of each quarter: asks consultants to confirm no outstanding invoices | — |
| `document-expiry` | Right-to-work documents expiring in 30 / 7 days | `document_reminder_days` |

Admins can trigger any job from the browser: `/api/cron/timesheet-reminder?force=1`.

### Docker
```bash
docker compose up -d --build      # app on :3000 + MariaDB, imports database/atlis_cloud.sql on first start
```

---

## 2. Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run migrate` | Apply `database/001_atlis_cloud.sql` to the database in `.env.local` |
| `npm run rebrand-db [-- --apply] [--include-candidate-content]` | Replace Tamis/TAMIS/tamis.cloud with atlis.cloud in all text data |
| `npm run schema` | Re-read the database structure into `lib/schema.json` (run after adding columns) |
| `npm run test:cv` | Run the CV parser against the 19 sample CVs in `tests/` (202 checks) |

---

## 3. How it's put together

```
app/(auth)        login, forgot / reset password, account activation
app/(app)         the signed-in app: dashboard, /m/[module] screens, CV parser, reports, roles, settings, masters
app/careers       public job board + apply (replaces the 12 copy-pasted technology microsites)
app/consent       public RTR / GDPR / no-dues confirmation pages
app/register      public client and vendor registration
app/api           JSON API (auth, generic module CRUD, workflows, CV parsing, reports, cron, public)
lib/modules.ts    ONE registry entry per screen: table, columns, lookups, filters, related tabs, portal scoping
lib/schema.json   generated description of every table and column
lib/crud.ts       generic list / search / filter / sort / create / edit / archive / restore / export / import
lib/cv/           the CV parser (text extraction + field extraction)
```

**Nothing is hardcoded in the screens.** Every list, form, detail page, filter, export and import is generated from `lib/modules.ts` + `lib/schema.json`. To show a new database column, run `npm run schema`; it appears in forms automatically. To add a screen, add one entry to `lib/modules.ts`.

**Dynamic data (previously hardcoded):**
- Sidebar menus and per-role access → `permissions` / `permission_role` tables (Roles & permissions screen)
- Job types → `master_request_type`; business entities, closure statuses, regions, contact roles, comment types, work modes, rate types … → **Masters → Dropdown options** (`app_options`)
- Branding (name, tagline, logos), page size, upload limit, session length, reminder days → **Settings** (`app_settings`)
- Reminder inbox per entity (was hardcoded email addresses in 4 copies of the cron code) → Dropdown options `entity_reminder_email`
- Report columns (regions and interview stages were hardcoded IDs) → read from `master_regions` and `master_profile_status`
- Technology microsites (12 hardcoded copies) → one `/careers` board filtered by `master_technology`

---

## 4. CV parser

`lib/cv/extract.ts` reads the file; `lib/cv/parse.ts` extracts the fields. Everything runs on your server.

**Formats:** PDF (layout-aware, including two-column CVs and sidebars), scanned/image-only PDFs and photos (offline OCR with a bundled English model), Word `.docx` (body, headers/footers, text boxes, tables), legacy Word `.doc`, RTF, ODT, TXT and HTML.

**Fields:** name, emails, phone numbers (validated, international format, country detected), location (city, country, UK postcode), LinkedIn/GitHub/websites, current role and employer, full work history with dates, total years of experience (overlapping jobs merged), stated experience, education (degree, subject, institution, year, grade), skills (matched against your `master_skills` / `technology_skills` plus a built-in library with aliases such as *k8s → Kubernetes*), certifications, languages, summary, date of birth, gender, nationality, notice period, right to work. Each field has a confidence score, with warnings where the recruiter should double-check.

**Accuracy:** 202 of 202 checks pass on the bundled test CVs (`npm run test:cv`), including a blind set written in formats the parser wasn't tuned on. No parser is right on every CV in the world, which is why every parse goes to a review screen before a profile is created, and why duplicates (same email or phone) are flagged.

**Where it's used:** CV Parser screen (bulk, up to 50 at a time, optional auto-add to a requirement), *Update from CV* on a profile, the public *Apply* form, *Fill from job description* on requirements, and the backwards-compatible `POST /api/profile/parseResume` (same response shape the old bulk-upload screen used).

---

## 5. Security changes from the old system
- Removed: hardcoded third-party API key for the old CV parsing service, and a hardcoded username/password in `storeTotalAffindaHitCount`.
- Fixed: SQL built by pasting dates into queries (`recruiterReport` and others), which allowed SQL injection. All queries are now parameterised, and identifiers are checked against the schema.
- The plaintext `pass_word` column is never read or shown, and is cleared whenever a password is changed.
- Session in an HttpOnly cookie (JWT); IP allow-lists and `isLogin`/`status` checks from the old login are kept; logins still go to `login_logs`.
- Portal users (consultants, umbrella companies, sub-vendors, vendors, clients) are restricted to their own records on the server, including files and anything they create.
- Rich text from the database is sanitised before display; public forms are rate-limited.

---

## 6. Accounts & roles
Roles and their menus/actions are edited at **Roles & permissions**. The action permissions from the old system (e.g. `req_add`, `profile_export`, `timesheet_edit`) are enforced. Users marked *view only* can browse and export but not change data.

See `docs/FEATURE-MAP.md` for where each old screen lives now, and the short list of items that were not carried over.

## Local-only data

The imported `database/atlis_cloud.sql` dump, `.env.local`, uploads, and `.local/` runtime data are intentionally excluded from Git because they contain personal data or credentials. Obtain a database backup separately before following the import or Docker instructions above. The committed migration upgrades an existing database; it does not create the full base schema.

CV sample datasets are also excluded. Supply your own fixtures to run npm run test:cv.
