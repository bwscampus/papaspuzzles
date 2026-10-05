# Papa's Puzzles

Next.js 15 (App Router) + Postgres (raw `pg`, SQL migrations in `db/migrations`). Design and rules:
`docs/technical-design.md`. Commands: `npm run check` (typecheck + lint + test), `npm run build`.

## Production Standard

This project follows the class Production Standard (the global `production-standard` skill).

- Before finishing any change that touches auth, the database or migrations, API routes, rendering of
  user content, uploads, env vars, or deploy/CI config, run the global `production-standard` skill (and `database-security` for database work) and fix
  any Critical/High finding it reports.
- Known gaps and their status live in `docs/SECURITY-GAPS.md`. Update it when you fix or find one.
- Identity comes from the session, never the request body. Credits, history, and admin rights require
  a **verified** email (`requireVerifiedUser()`, `toUser()` in `src/lib/auth.ts`).
