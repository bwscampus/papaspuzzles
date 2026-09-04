# Papa's Puzzles

Trade your puzzles for exciting new ones! A small marketplace where puzzlers trade in finished puzzles, donate
puzzles for credits, and spend credits on new ones.

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

| Variable         | Purpose                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | Postgres connection string                                                               |
| `SESSION_SECRET` | Long random string for signing login cookies (`openssl rand -hex 32`)                    |
| `ADMIN_EMAILS`   | Comma-separated emails whose accounts can open `/admin`                                  |
| `UPLOAD_DIR`     | Directory for uploaded photos (default `./uploads`)                                      |
| `APP_URL`        | Public URL used in password-reset emails (required in production)                        |
| `RESEND_API_KEY` | Optional. Without it, reset links are printed to the server log instead of emailed       |
| `EMAIL_FROM`     | Optional sender for reset emails                                                         |
| `DATABASE_SSL`   | Optional `true`/`false` override. Defaults to off for `*.railway.internal` and localhost |

### Commands

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `npm run check`    | typecheck + lint + unit tests (what CI runs, minus build) |
| `npm run test`     | Vitest unit tests (`src/**/*.test.ts`)                    |
| `npm run format`   | Prettier                                                  |
| `npm run migrate`  | Apply pending SQL migrations                              |
| `scripts/smoke.sh` | End-to-end API test against a running app (see below)     |

```bash
# End-to-end smoke test (creates throwaway accounts; ADMIN_EMAIL must be in ADMIN_EMAILS)
BASE=http://localhost:3000 ADMIN_EMAIL=founder@example.com scripts/smoke.sh
```

## How it works

**Accounts are optional.** Guests trade or donate with a name and email. An account (email + password) is
needed to spend credits and to see My Trades. Everything is keyed by lowercased email, so a guest's history and
credits appear once they create an account with the same email.

**Trader tier.** An email is _returning_ if it has at least one completed trade or one accepted donation;
otherwise _new_. The trade form looks this up before sign-in.

**Trades.** New traders give 2 puzzles and pick 1; returning traders give 1 and pick 1 (enforced by the
server). The picked puzzle is reserved immediately. The admin marks the trade completed after hand-off
(puzzle → traded) or cancels it (puzzle → available again).

**Donations.** Puzzles enter review. When the admin accepts a donation, its puzzles go on Explore and credits
are awarded: a new donor earns (count − 1), everyone else earns 1 per puzzle. Credits live in an email-keyed
ledger (`credit_entries`).

**Credits.** Signed-in members pick up to `balance` available puzzles. Puzzles are reserved and credits deducted
atomically; the admin fulfils the pick-up (→ claimed) or cancels it (→ available, credits refunded).

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
- `RESEND_API_KEY` + `EMAIL_FROM` once an email provider is set up

**Backups:** Railway snapshots the Postgres volume. For a manual export, use the Postgres service's public URL:
`pg_dump "$DATABASE_PUBLIC_URL" > backup.sql`. Uploaded photos live on the app volume.

**Admin access:** sign up normally with an email listed in `ADMIN_EMAILS`; the Admin link appears in the nav.
