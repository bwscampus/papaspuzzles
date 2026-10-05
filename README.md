# Papa's Puzzles

Trade your puzzles for exciting new ones! A small marketplace where puzzlers trade in finished puzzles and
donate the ones they have completed.

- Product spec: [overview.md](overview.md)
- Technical design: [docs/technical-design.md](docs/technical-design.md)

## Stack

Next.js 15 (App Router) · React 18 · TypeScript · Tailwind · PostgreSQL via `pg` · cookie sessions (`jose`) ·
photos on disk · Railway.

## Local development

```bash
npm install
cp .env.local.example .env.local        # fill in SESSION_SECRET and ADMIN_EMAILS
docker run -d --name pp-pg -e POSTGRES_PASSWORD=pp -e POSTGRES_DB=papaspuzzles -p 5433:5432 postgres:16
npm run migrate                         # applies db/migrations/*.sql
npm run dev                             # http://localhost:3000
```

| Variable                 | Purpose                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Postgres connection string                                                                         |
| `MIGRATION_DATABASE_URL` | Owner connection used by `npm run migrate`. Falls back to `DATABASE_URL` (fine locally)            |
| `APP_DB_PASSWORD`        | Production: password for the restricted `app_rw_login` role that migrate creates and keeps updated |
| `SESSION_SECRET`         | Long random string for signing login cookies (`openssl rand -hex 32`)                              |
| `ADMIN_EMAILS`           | Comma-separated emails whose accounts can open `/admin` once the email is **verified**             |
| `UPLOAD_DIR`             | Directory for uploaded photos (default `./uploads`)                                                |
| `APP_URL`                | Public URL used in password-reset emails (required in production)                                  |
| `RESEND_API_KEY`         | Required in production (reset + verification emails). Locally, emails are suppressed               |
| `EMAIL_DEV_LOG`          | Local only: `1` prints suppressed emails (with links) to the server log                            |
| `EMAIL_FROM`             | Optional sender for reset and verification emails                                                  |
| `DATABASE_SSL`           | Optional `true`/`false` override. Defaults to off for `*.railway.internal` and localhost           |

### Commands

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `npm run check`    | typecheck + lint + unit tests (what CI runs, minus build) |
| `npm run test`     | Vitest unit tests (`src/**/*.test.ts`)                    |
| `npm run format`   | Prettier                                                  |
| `npm run migrate`  | Apply pending SQL migrations                              |
| `scripts/smoke.sh` | End-to-end API test against a running app (see below)     |

```bash
# End-to-end smoke test (local/staging only; creates throwaway accounts; ADMIN_EMAIL must be in
# ADMIN_EMAILS). DATABASE_URL lets it mark test emails verified, since it can't click inbox links.
BASE=http://localhost:3000 ADMIN_EMAIL=founder@example.com ADMIN_PASSWORD=choose-one \
  DATABASE_URL=postgresql://postgres:pp@localhost:5433/papaspuzzles scripts/smoke.sh
```

## How it works

**Accounts are optional.** Guests trade or donate with a name and email. An account (email + password) is
needed to see My Trades. Everything is keyed by lowercased email, so a guest's history appears once they create
an account with the same email.

**Credits and trader tier.** One ledger per email (`credit_entries`); `credit_balance(email)` is −1 plus the sum
of entries, so everyone starts at −1. Each puzzle you submit is +1 once approved (donation accepted, trade
completed, or approved individually), each puzzle taken in a trade is −1 at request time (refunded on cancel),
and credit pick-ups charge at request and refund on cancel. Returning = balance ≥ 0; a trade requires
`max(1, 1 − balance)` pledged puzzles, so a first trade is two for one.

**Trades.** New traders give 2 puzzles and pick 1; returning traders give 1 and pick 1 (enforced by the
server). The picked puzzle is reserved immediately. The admin marks the trade completed after hand-off
(puzzle → traded) or cancels it (puzzle → available again).

**Donations.** Puzzles enter review. The admin accepts or rejects each puzzle from the Donations page (the
Puzzles tab only edits and deletes); each accepted puzzle adds one credit to the submitter's ledger, attached to the puzzle so it can never
double-count.

**Credits are internal.** The ledger only sets the trade rule (first trade 2-for-1, then 1-for-1); members never
see a balance or spend credits. The pick-up flow (`/api/redemptions`) still exists for admins but has no page.
A donation batch's status follows its puzzles: pending while any is under review, then accepted or rejected.

**Puzzle statuses:** `pending_review → available → reserved → traded | claimed`, plus `rejected`.

## Code map

```
src/app/            pages and API routes (api/** use the {ok,data}|{ok,error} envelope)
src/app/admin/      server-gated admin area (layout.tsx returns 404 for non-admins)
src/components/     ui primitives, PuzzleForm/PuzzleFormList/PuzzlePicker, AuthDialog, admin tables
src/lib/            db, session, auth, validate, constants, api envelope, rate limit
src/lib/services/   all business logic; every mutation runs in a transaction
src/content/site.ts founder copy from overview.md
db/migrations/      SQL schema; scripts/migrate.mjs applies it on start
```

## Deployment (Railway)

The app service builds with Railpack and starts with `npm run start`, which runs migrations and then
`next start`. Configure:

- Postgres service, referenced by the app as `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- A volume mounted at `/data` with `UPLOAD_DIR=/data/uploads`
- `SESSION_SECRET`, `ADMIN_EMAILS`, `APP_URL` (the public domain)
- `RESEND_API_KEY` + `EMAIL_FROM`: required. Without them signup can't send verification links, so
  nobody (admins included) can unlock credits or `/admin`, and the server logs a CONFIG ERROR at startup

**Backups:** production Postgres has daily (kept 6 days) and weekly (kept 27 days) snapshots plus
point-in-time recovery (any moment in roughly the last 4 weeks), all in Railway → Postgres → Backups.
Restores go into a new Postgres service, so you can check it before switching `DATABASE_URL`.
Uploaded photos live on the app volume and are not covered by the database backups.

### Least-privilege database user (not yet applied in production)

`npm run migrate` runs as the database **owner** and, after migrations, creates the group role `app_rw`
(read/write rows only: no schema changes, no superuser, no RLS bypass). When `APP_DB_PASSWORD` is set it
also creates the login `app_rw_login` in that group and re-applies its password on every deploy.
The app should connect as `app_rw_login` so a bug or injection can't drop tables or touch roles.

Cut-over, per environment (do `staging` first, then `production`), after this code is deployed:

1. App service → Variables: add `APP_DB_PASSWORD` (random, e.g. `openssl rand -hex 24`) and **seal** it.
2. Add `MIGRATION_DATABASE_URL=${{Postgres.DATABASE_URL}}` (the owner, for migrations).
3. Change `DATABASE_URL` to
   `postgresql://app_rw_login:${{APP_DB_PASSWORD}}@${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}`.
   The redeploy runs migrate (as owner, creating the login) and then starts the app as `app_rw_login`.
4. Check: the site loads, `/api/puzzles` returns 200, sign in and do one write (e.g. join the waitlist).

**Rollback:** set `DATABASE_URL` back to `${{Postgres.DATABASE_URL}}`. Nothing else needs undoing.

To verify the role locally or in CI: `MIGRATION_DATABASE_URL=… APP_DATABASE_URL=postgresql://app_rw_login:…@… node scripts/check-app-role.mjs`.

**One-time imports:** the May 2026 inventory from the old Firebase site was imported with
`scripts/import-firebase.mjs`, reading `db/seed/firebase-donations.json` (kept as the historical record).
It runs inside the app container so it can write photos to the volume:

```
railway ssh --service papaspuzzles -- node scripts/import-firebase.mjs            # dry run, writes nothing
railway ssh --service papaspuzzles -- node scripts/import-firebase.mjs --apply    # import (safe to re-run)
railway ssh --service papaspuzzles -- node scripts/import-firebase.mjs --undo     # remove what it imported
```

Imported puzzles are admin inventory with photos at `/uploads/firebase-<id>.<ext>`; that prefix is how
re-runs skip done records and how `--undo` finds them. Locally, prefix with `node --env-file=.env.local`.

**Admin access:** sign up normally with an email listed in `ADMIN_EMAILS` and confirm it via the emailed link; the Admin link appears in the nav once verified.
