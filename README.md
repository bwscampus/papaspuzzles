# Papa's Puzzles

A simple marketplace for families to donate, trade, and request old puzzles.

## Tech Stack
- **Frontend**: Next.js, React, Tailwind CSS, Lucide Icons
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Railway), accessed with `pg`
- **Auth**: Email/password accounts stored in Postgres; sessions are signed JWT cookies (`jose`)
- **Uploads**: Puzzle photos on disk (a Railway volume in production), served from `/uploads/<name>`
- **Hosting**: Railway

## Local development

### 1. Install and configure

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | Long random string for signing login cookies (`openssl rand -hex 32`) |
| `UPLOAD_DIR` | Directory for uploaded photos (default `./uploads`) |
| `APP_URL` | Public URL used in password-reset emails |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional. Without them, reset emails are printed to the server log |
| `DATABASE_SSL` | Optional override (`true`/`false`). Defaults to off for `*.railway.internal` and localhost |

A quick local Postgres:

```bash
docker run -d --name pp-pg -e POSTGRES_PASSWORD=pp -e POSTGRES_DB=papaspuzzles -p 5433:5432 postgres:16
# DATABASE_URL=postgresql://postgres:pp@localhost:5433/papaspuzzles
```

### 2. Migrate and run

```bash
npm run migrate   # applies db/migrations/*.sql once each (tracked in schema_migrations)
npm run dev       # http://localhost:3000
```

## Database
Schema lives in [db/migrations](db/migrations). Add a new numbered `.sql` file for each change; the
runner in `scripts/migrate.mjs` applies pending files in order inside a transaction and runs
automatically before the app starts on Railway.

Tables: `users` (includes `password_hash`), `password_reset_tokens`, `donations`, `requests`, `trades`,
`redemptions`. Multi-step operations (accepting a donation batch, redeeming credits, bumping user
counters) are Postgres functions so they run atomically.

## Railway deployment
`railway.json` configures the build (Railpack, `npm run build`) and start command
(`npm run migrate && npm run start`).

One-time setup in a Railway project:
1. Add a **Postgres** database service.
2. Add the app service from this GitHub repo (`bwscampus/papaspuzzles`).
3. Attach a **volume** to the app service, mounted at `/data`.
4. Set service variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (reference the Postgres service)
   - `SESSION_SECRET` = a long random string
   - `UPLOAD_DIR` = `/data/uploads`
   - `APP_URL` = the app's public URL
   - `RESEND_API_KEY` and `EMAIL_FROM` once an email provider is set up
5. Generate a public domain for the app service.

Deploys run migrations first, then start Next.js on Railway's `PORT`.

## Features
- **Landing Page**: Overview of the platform.
- **Explore**: Browse listings and request a swap.
- **Donate**: Submit a batch of puzzles for admin review; credits are awarded on acceptance.
- **Redeem**: Spend credits on available puzzles.
- **Request**: Form to request puzzles.
- **Admin Panel** at `/admin`: review donations, requests, trades, and redemptions; add inventory.
  Admin auth is currently disabled for alpha testing.

## Notes
- API routes derive the signed-in user from the session cookie; they never trust a `uid` sent by the browser.
- The `/api/my-trades` email parameter is only honoured for signed-out visitors.
