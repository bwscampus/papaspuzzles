# Papa's Puzzles — Technical Design Document

Status: Approved 2026-09-04 · Owner: engineering · Product owner: Berkeley Katz (founder) · Date: 2026-09-04


## 1. Summary

Papa's Puzzles is a puzzle-trading service run by a student founder in Los Angeles. People trade in finished puzzles for new ones, donate puzzles for credits, and spend credits on puzzles. The current website (Next.js on Railway) was produced through several hand-offs and has critical security holes, unenforced business rules, duplicated flows, and features outside the spec. This document specifies a rebuild of the application code on the existing stack, with a clarified product spec, a new data model, one API contract, one design system, and a test/CI baseline.

## 2. Goals and non-goals

**Goals**
1. Every product rule in `overview.md` is enforced on the server and reflected in the UI.
2. Admin functions are only reachable by the founder's account.
3. One code path per concept: one puzzle form, one donation flow, one credit-spend flow, one API response shape.
4. The site is fast (no 35 MB hero video), accessible (WCAG AA contrast, keyboard-operable dialogs), and on-brand (logo palette).
5. A contributor can run, test, and deploy with documented commands; CI blocks broken builds.

**Non-goals (explicitly out of scope for this release)**
- Multiple branches/regions (SF, other schools). Data model does not carry a branch column yet; adding one later is additive.
- Charity tracking. New traders still give two puzzles; which one goes to charity is handled offline.
- Automated "is this a puzzle" photo classification. Admin review is the check.
- Puzzle requests (the current "Request a puzzle" feature is removed).
- Payments, shipping, notifications beyond password-reset email.

## 3. Product specification (clarified `overview.md`)

The founder's original text (mission, values, story, phrase, quote, contact) is kept verbatim as site content. The following definitions and rules were decided with the product owner on 2026-09-04 and are added to `overview.md`.

### 3.1 Definitions
| Term | Definition |
|---|---|
| Puzzle | name, pieces (100 / 300 / 500 / 1000 / 2000+), theme (Animals, Landscape, Art, Food, Cityscape, Movies, Other), condition (new / good / fair), photo. **No difficulty.** |
| Puzzle status | `pending_review` → `available` → `reserved` → `traded` or `claimed`; plus `rejected`. Explore shows only `available`. |
| Account | Optional. Email + password. Needed to spend credits and to view My Trades. Identity for all activity is the lowercased email, so guest activity attaches to an account created later with the same email. |
| Trader tier | **new** = no completed trade and no accepted donation batch under this email. **returning** = at least one of either. Computed by email, so it works before sign-in. |
| Credit | 1 credit claims 1 available puzzle. Credits do not expire. |

### 3.2 Rules
- **Start a Trade**: new traders give 2 puzzles and pick 1; returning traders give 1 and pick 1. Enforced server-side from the tier at submit time. The picked puzzle is `reserved` immediately. Given puzzles enter `pending_review`. The trader chooses a drop-off date and one of four time slots (10 AM, 12 PM, 2 PM, 4 PM). Admin marks the trade **completed** after hand-off (picked puzzle → `traded`; trader is now returning) or **cancelled** (picked puzzle → `available`; given puzzles still pending → `rejected`).
- **Donate Now**: one or more puzzles with name + email. Puzzles enter `pending_review`. When admin **accepts** the batch, puzzles → `available` and credits are awarded: if the donor was **new** at acceptance time, credits = count − 1; otherwise credits = count. The confirmation screen shows the server's estimate as "once approved, you'll have about N credits". Admin may **reject** a batch (puzzles → `rejected`, no credits).
- **Use Your Credits**: signed in only. Pick up to `balance` available puzzles. Atomically: puzzles → `reserved`, balance − n, a pickup record created. Admin marks the pickup **fulfilled** (puzzles → `claimed`) or **cancelled** (puzzles → `available`, credits refunded).
- **Explore**: `available` puzzles with filters Pieces and Theme. Card: photo, pieces badge, name, theme, condition, "Start a Trade".
- **My Trades**: signed in only. Trades (gave → received, drop-off, status), donations (count, status, credits), credit pickups.
- **Admin**: an account whose email is listed in the `ADMIN_EMAILS` environment variable. Views: Puzzles (all, status filter, approve/reject/edit/delete; Add Inventory with puzzle fields only), Users, Trades, Donations & credits, Credit pickups.

### 3.3 Pages
Home · Explore · Start a Trade (3 steps: Info → Your puzzles → Pick a puzzle + drop-off) · Donate Now · Use Your Credits · My Trades · About Us · Sign in / Sign up / Reset password (dialog + page) · Admin.

### 3.4 Content
Phrase "Trade your puzzles for exciting new ones!"; quote "Every finished puzzle deserves a second life, and every puzzler deserves a new challenge."; three steps Donate · Choose · Swap; three buttons Start a Trade · Donate Now · Use Your Credits; About Us = Mission, Values (Joy, Excitement, Innovative, Uplift), Story (Memories; Now it all started), quote, founder photo, "Berkeley Katz, Papa's Puzzles Founder, info@papaspuzzles.org".

## 4. Current-state assessment (why a rebuild)

| Area | Finding | Severity |
|---|---|---|
| Admin auth | `requireAdminSession()` always returns null; `/admin` page starts authenticated; all `/api/admin/*` public | Critical |
| Credit minting | `POST /api/admin/donations/accept-batch` unauthenticated and trusts body `donorUid` | Critical |
| Data exposure | `GET /api/redeem` lists all redemptions; `GET /api/inventory` returns donor emails; `GET /api/my-trades?email=` reads anyone's history | High |
| Business rules | 2-for-1 only in browser; two donation paths with different credit formulas; two credit-spend paths writing different tables; first-time flag stuck when credits = 0; guest credits stranded on password-less rows | High |
| Spec drift | difficulty everywhere; requests feature; wrong phrase/quote/button labels; About missing quote/photo/contact; metadata "Puzzle Swap" | Medium |
| Code quality | 875-line admin page, 698-line trade page, auth modal duplicated, three puzzle forms, 13 `alert()`/`confirm()`, no tests, no CI, ESLint 8 | Medium |
| Repo | two 35 MB videos, 8 MB PDF, screenshots at root; legacy `server/` Express app; dead Vercel workflow | Medium |
| Accessibility/brand | primary `#FFB7B2` ≈ 2:1 contrast; no label associations; non-dialog modal | Medium |

Decision: rebuild `src/` (pages, components, API, schema) on the same stack rather than patch. The stack itself is fine; the application code is not.

## 5. Architecture

### 5.1 Stack and rationale
| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router), React 18, TypeScript strict | Already deployed and working; one codebase for UI and API; server components for admin gating. |
| Styling | Tailwind 3 with a token config | Already in use; tokens make the palette enforceable. |
| Database | PostgreSQL 16 on Railway, accessed with `pg` and hand-written SQL | Small schema; SQL with CHECK constraints and transactions gives correctness without an ORM's weight. No ORM (avoids migration tooling churn for a student-maintained project). |
| Migrations | Plain SQL files under `db/migrations`, applied by `scripts/migrate.mjs` at container start (tracked in `schema_migrations`, advisory-locked) | Already built and proven on Railway. |
| Auth | Email + password, scrypt hashes, httpOnly JWT session cookie (`jose`, 30 days) | Already built; no third-party auth dependency; guests supported. |
| Uploads | Disk under `UPLOAD_DIR` on a Railway volume, served by `/uploads/[name]` | Already built; no object-storage account needed. |
| Email | Resend HTTP API for password reset; logs to console when unconfigured | Already built. |
| Hosting | Railway: app service + Postgres service + volume at `/data` | Already provisioned. |
| Tests | Vitest for pure logic; optional DB integration tests behind `TEST_DATABASE_URL` | Lightweight; runs in CI without a database. |
| Lint/format | ESLint 9 flat config (`next/core-web-vitals`, `next/typescript`, ban `alert`/`confirm`), Prettier with Tailwind plugin | Modern defaults, enforceable in CI. |
| CI | GitHub Actions: typecheck → lint → test → build | Blocks regressions on PRs. |

### 5.2 Request flow
Browser → Next.js route handler (`src/app/api/**/route.ts`) → validates input (`src/lib/validate.ts`) → calls one service function (`src/lib/services/*.ts`) → runs SQL inside `withTransaction` when it mutates → returns the standard envelope. Pages are client components using a typed fetch wrapper (`src/lib/client/api.ts`), except `/admin/layout.tsx`, which is a server component that gates on `getCurrentUser()`.

### 5.3 Source layout
```
src/
  app/                      pages + API routes (see §8, §9)
  components/ui/            Button, Input, Select, Card, Modal, Badge, Alert, Spinner, EmptyState, Stepper
  components/               PageShell, Navbar, Footer, AuthDialog, Toast, PuzzleCard, PuzzleFilters,
                            PhotoUpload, PuzzleForm, PuzzleFormList, PuzzlePicker, TraderStatusNotice
  components/admin/         AdminNav, DataTable, StatusBadge, ConfirmButton
  context/                  AuthContext (user, isAdmin, openAuthDialog), ToastContext
  content/site.ts           all spec copy (phrase, quote, mission, values, story, founder)
  lib/                      db, session, storage, email, validate (kept); api, auth, constants, types,
                            trader, credits (new); services/{puzzles,donations,trades,redemptions,users}
  lib/client/api.ts         typed browser fetch wrapper
db/migrations/0001_schema.sql
scripts/migrate.mjs
```
Kept unchanged from the current code: `src/lib/db.ts`, `session.ts`, `storage.ts`, `email.ts`, `scripts/migrate.mjs`, `railway.json`, `next.config.mjs`. Everything else under `src/` is rewritten. Removed: `server/`, `src/app/request`, `src/app/redeem` (renamed `/credits`), all old API routes, `lib/adminAuth.ts`, `lib/authErrorMessages.ts`, `lib/puzzleConstants.ts`, `types/puzzle.ts`.

## 6. Data model

Single fresh migration `db/migrations/0001_schema.sql` replacing `0001_init.sql`. It begins with `drop table if exists … cascade` / `drop function if exists …` for the old objects so it applies cleanly both on the existing Railway database (which holds only test data) and on a fresh local database. All tables: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null default now()`. Every enum-like column has a CHECK constraint.

| Table | Columns (beyond id/created_at) | Notes |
|---|---|---|
| `users` | `email text not null`, `display_name text`, `password_hash text not null` | Unique index on `lower(email)`. Only real accounts; guests have no row. |
| `password_reset_tokens` | `token_hash text pk`, `user_id uuid → users on delete cascade`, `expires_at`, `used_at` | As today. |
| `donation_batches` | `donor_name`, `donor_email`, `status` ∈ pending_review/accepted/rejected, `credits_awarded int`, `was_first_batch bool`, `reviewed_at` | Index `lower(donor_email)`, `status`. |
| `trades` | `trader_name`, `trader_email`, `tier` ∈ new/returning (snapshot), `received_puzzle_id uuid → puzzles`, `dropoff_date date`, `dropoff_slot` ∈ 10:00/12:00/14:00/16:00, `status` ∈ pending/completed/cancelled, `completed_at`, `cancelled_at` | Index `lower(trader_email)`, `status`. |
| `puzzles` | `name`, `pieces int` ∈ {100,300,500,1000,2000}, `theme` ∈ THEMES, `condition` ∈ new/good/fair, `image_url not null`, `status` ∈ pending_review/available/reserved/traded/claimed/rejected, `source` ∈ donation/trade/admin, `donation_batch_id → donation_batches`, `given_in_trade_id → trades` (FK added after `trades`), `submitted_by_name`, `submitted_by_email`, `reviewed_at` | CHECKs: source=donation ⇔ batch id set; source=trade ⇔ trade id set. Index `status`, `theme`, `pieces`, both FKs. 2000 stored, displayed as "2000+". |
| `redemptions` | `user_id → users`, `email`, `credits_spent int > 0`, `status` ∈ pending_pickup/fulfilled/cancelled, `fulfilled_at`, `cancelled_at` | |
| `redemption_puzzles` | `redemption_id`, `puzzle_id`; pk (both); unique `puzzle_id` | |
| `credit_entries` | `email`, `delta int ≠ 0`, `reason` ∈ donation_accepted/redemption/redemption_cancelled/admin_adjustment, `donation_batch_id`, `redemption_id`, `note` | Ledger keyed by email so guests accrue credits before they have an account. Unique partial index on `donation_batch_id` where reason = donation_accepted (idempotent awards). Index `lower(email)`. |

**SQL helpers** (read-only, `stable`):
- view `trader_activity` = emails with a completed trade ∪ emails with an accepted batch.
- `is_returning_trader(email) → boolean`.
- `credit_balance(email) → int` = `coalesce(sum(delta),0)`.
All write logic lives in TypeScript transactions; the old plpgsql functions are dropped.

## 7. Business logic (services)

All functions in `src/lib/services/*.ts`; mutations run inside `withTransaction` with `select … for update` on the rows they change and throw `ApiError` with an HTTP status.

| Function | Transaction steps |
|---|---|
| `getTraderStatus(email)` | `is_returning_trader` → `{returning, requiredGiven: returning ? 1 : 2}` |
| `creditsForBatch(count, isNew)` | pure: `isNew ? max(0, count-1) : count` |
| `submitDonation({name,email,puzzles})` | insert batch (pending_review); insert puzzles (pending_review, source donation); compute tier; return `{batchId, puzzleCount, returning, estimatedCredits}` |
| `acceptDonationBatch(id)` | lock batch, require pending_review; count puzzles still pending_review (admin may have rejected some); 400 if 0; `isNew = !is_returning_trader(donor_email)`; credits = `creditsForBatch`; puzzles → available; batch → accepted with `credits_awarded`, `was_first_batch` (always recorded, even when 0 credits); insert ledger entry if credits > 0 |
| `rejectDonationBatch(id)` | pending puzzles → rejected; batch → rejected |
| `submitTrade({name,email,wantedPuzzleId,givenPuzzles,dropoffDate,dropoffSlot})` | tier by email; **400 if `givenPuzzles.length !== requiredGiven`**; lock wanted puzzle, 409 unless available; insert trade (tier snapshot, pending); insert given puzzles (pending_review, source trade, `given_in_trade_id`); wanted → reserved |
| `completeTrade(id)` | lock, require pending; → completed; received puzzle → traded |
| `cancelTrade(id)` | → cancelled; received reserved → available; given puzzles still pending → rejected |
| `redeemPuzzles(user, puzzleIds)` | `pg_advisory_xact_lock(hashtext(lower(email)))`; dedupe ids; balance = `credit_balance`; 400 if balance < n; lock puzzles, 409 unless all available; insert redemption + join rows; puzzles → reserved; ledger −n |
| `fulfillRedemption(id)` / `cancelRedemption(id)` | → fulfilled, puzzles → claimed / → cancelled, puzzles → available, ledger +n |
| `puzzles.adminUpdate/adminDelete` | status transitions allowed only among pending_review/available/rejected; refuse (409) when reserved/traded/claimed or referenced by a trade |
| `users.adminList()` | users joined with `credit_balance`, completed-trade count, accepted-batch count, `is_returning_trader`, `isAdmin` computed in TS |

Signed-in submissions use the session email (name from the form). Guests may use any valid email.

## 8. API contract

**Envelope** (every route): success `{ "ok": true, "data": … }`; error `{ "ok": false, "error": { "code": "validation" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "internal", "message": string, "field"?: string } }` with matching HTTP status. Implemented by `src/lib/api.ts` (`ok`, `fail`, `ApiError`, `handle`) which also maps Postgres error codes and never leaks raw database messages. JSON keys are camelCase; the service layer maps from snake_case columns.

Auth levels: **P** public · **S** signed-in · **A** admin.

| Route | Auth | Request | `data` |
|---|---|---|---|
| POST `/api/auth/signup` | P | `{email, password, name?}` | `{user}` |
| POST `/api/auth/signin` | P | `{email, password}` | `{user}` |
| POST `/api/auth/signout` | P | — | `{}` |
| GET `/api/auth/me` | P | — | `{user: User \| null}`; `User = {id, email, displayName, isAdmin}` |
| POST `/api/auth/forgot-password` | P | `{email}` | `{}` (always 200) |
| POST `/api/auth/reset-password` | P | `{token, password}` | `{}` |
| GET `/api/trader-status?email=` | P | — | `{returning, requiredGiven}` (leaks only a boolean; accepted) |
| GET `/api/puzzles?theme=&pieces=` | P | — | `{id, name, pieces, theme, condition, imageUrl}[]`; available only; **no submitter data** |
| POST `/api/upload` | P | multipart `puzzlePhoto` (≤10 MB; jpeg/png/webp/gif/heic; HEIC converted) | `{imageUrl}` |
| POST `/api/donations` | P | `{name, email, puzzles: PuzzleInput[]}` (1–20) | `{batchId, puzzleCount, returning, estimatedCredits}` |
| POST `/api/trades` | P | `{name, email, wantedPuzzleId, givenPuzzles: PuzzleInput[], dropoffDate, dropoffSlot}` | `{tradeId, tier}` |
| POST `/api/redemptions` | S | `{puzzleIds: string[]}` | `{redemptionId, creditsSpent, balance}` |
| GET `/api/me/credits` | S | — | `{balance, entries[]}` |
| GET `/api/me/history` | S | — | `{trades[], donations[], redemptions[]}` |
| GET/POST `/api/admin/puzzles` | A | POST `PuzzleInput` | `AdminPuzzle`(s) |
| PATCH/DELETE `/api/admin/puzzles/[id]` | A | partial `PuzzleInput` + `status?` | `AdminPuzzle` / `{}` |
| GET `/api/admin/donation-batches?status=` | A | — | batches with puzzles |
| POST `/api/admin/donation-batches/[id]` | A | `{action: 'accept' \| 'reject'}` | `{creditsAwarded, wasFirstBatch, puzzlesPublished}` |
| GET `/api/admin/trades?status=` · POST `/api/admin/trades/[id]` | A | `{action: 'complete' \| 'cancel'}` | `AdminTrade` |
| GET `/api/admin/redemptions` · POST `/api/admin/redemptions/[id]` | A | `{action: 'fulfill' \| 'cancel'}` | `AdminRedemption` |
| GET `/api/admin/users` | A | — | users with balance, counts, tier, isAdmin |
| GET `/api/admin/credit-entries` | A | — | ledger |

`PuzzleInput = {name (≤120), pieces ∈ PIECES, theme ∈ THEMES, condition ∈ CONDITIONS, imageUrl (must start with "/uploads/")}` is the single puzzle shape used by donate, trade, and admin inventory.

## 9. Frontend design

### 9.1 Design tokens (derived from the logo: dusty rose circle, salmon and cream pieces)
| Token | Hex | Use |
|---|---|---|
| `primary` | `#7E4B57` | headings, links, primary buttons (white text). 6.9:1 on white |
| `primary-hover` | `#5E3641` | |
| `rose` | `#C49AA2` | logo-matching bands, borders (never text) |
| `rose-tint` / `rose-faint` | `#F3E3E6` / `#FBF4F5` | card tints, badges |
| `accent` | `#F2A48E` | badges, step icons, secondary button background with ink text (never as text) |
| `accent-text` | `#A8503A` | accent-coloured text, "reserved" status. 5.4:1 |
| `page` / `cream` | `#FFFBEA` / `#FFF6C8` | page background / hero band |
| `ink` / `muted` | `#2E2226` / `#6B5A5F` | body / secondary text |
| `success` / `warn` / `danger` | `#2F7A4F` / `#9A6B00` / `#B3261E` | status badges (≥4.5:1) |
Fonts: Nunito (display) + Inter (body) via `next/font`. Cards `rounded-2xl`, buttons `rounded-full`.

### 9.2 Components
- `ui/`: Button (variants primary/secondary/outline/ghost/danger, `loading`, renders `Link` when `href`), Input/Select (label, hint, error, generated `id`, `aria-describedby`), Card, Modal (native `<dialog>`; Escape and backdrop close; focus management), Badge (status → colour from constants), Alert, Spinner, EmptyState, Stepper.
- AuthDialog: one instance mounted by the root Providers; modes sign-in / sign-up / forgot; opened from Navbar or any gated page via `openAuthDialog()`. Replaces both duplicated modals.
- Toast replaces every `alert()`/`confirm()`; destructive admin actions use `ConfirmButton`.
- PuzzleForm (one `PuzzleInput`, controlled), PuzzleFormList (`fixedCount` for trade, `min=1` for donate), PhotoUpload (posts `/api/upload`, preview), PuzzlePicker (available grid + filters; single/multi with `max`; `?wanted=` preselect), PuzzleCard, PuzzleFilters, TraderStatusNotice (debounced trader-status lookup on email blur).
- `lib/client/api.ts`: `get/post/patch/del/upload`, unwraps the envelope, throws `ApiClientError {code, message, field}`.

### 9.3 Pages
| Route | Content |
|---|---|
| `/` | hero video (≤3 MB mp4, muted, loop, poster, cream overlay), phrase, three buttons, "How it works" Donate/Choose/Swap, quote, footer |
| `/about` | mission, values (spec order, sentence case), story, quote, founder photo, founder card with `mailto:info@papaspuzzles.org` |
| `/explore` | PuzzleFilters (theme, pieces) + PuzzleCard grid; "Start a Trade" → `/trade?wanted=id`; "Use credits" when signed in with balance > 0 |
| `/trade` | Stepper: 1 Info (prefilled from session; TraderStatusNotice explains 2-for-1 vs 1-for-1) → 2 Your puzzles (PuzzleFormList fixedCount) → 3 Pick a puzzle + drop-off date/slot → confirmation |
| `/donate` | Info + PuzzleFormList → success "Once approved you'll have about N credits" + sign-up nudge |
| `/credits` | session gate; balance header; PuzzlePicker multi `max=balance`; confirmation "Pick-up pending" |
| `/my-trades` | session gate; Trades, Donations, Pickups sections |
| `/reset-password` | token from URL, new password form |
| `/admin/*` | server-gated layout (404 for non-admins); AdminNav → puzzles, inventory, trades, donations, users; DataTable with status filters and row actions |
Root metadata: title "Papa's Puzzles", description from the phrase, favicon and OG image from the logo.

## 10. Security

- Admin: `ADMIN_EMAILS` (comma-separated) parsed once; `isAdmin` computed per request, never stored; `requireAdmin` on every admin route; `/admin` layout gate.
- Identity: every mutation derives the user from the session cookie; client-supplied ids are never trusted. Guest submissions carry only name and email.
- Public reads expose no personal data (`/api/puzzles` projects public columns only). `/api/me/*` are session-only; the old `?email=` lookup is gone.
- Input: every field validated against the constants; arrays bounded (≤20 puzzles per submission, ≤balance per redemption); ids UUID-checked; `imageUrl` must be a local upload path.
- Errors: standard envelope; raw Postgres messages logged server-side only.
- Uploads: size and type checks kept; add magic-byte sniffing for jpeg/png/webp/gif, `X-Content-Type-Options: nosniff` on served files, and a per-IP rate limit (in-memory token bucket, sufficient for one instance).
- Auth hardening: rate limit sign-in and forgot-password per IP; password minimum 8; reset invalidates other sessions by storing a `session_version` on `users` and embedding it in the JWT (small addition to `session.ts`); reset-link origin taken only from `APP_URL`.
- Database TLS: keep `rejectUnauthorized: false` only for the Railway public proxy; the private `railway.internal` host uses no TLS (as today).

## 11. Infrastructure and operations

- Railway project `papaspuzzles`: app service (GitHub `bwscampus/papaspuzzles`, `main`), Postgres service, volume mounted at `/data`.
- Start command `npm run start` = migrate then `next start`; health check `/`.
- Environment variables: `DATABASE_URL` (reference to Postgres), `SESSION_SECRET`, `UPLOAD_DIR=/data/uploads`, `APP_URL`, `ADMIN_EMAILS`, optional `RESEND_API_KEY`, `EMAIL_FROM`, `DATABASE_SSL`.
- Backups: Railway Postgres volume snapshots; uploads live on the app volume. Document a manual `pg_dump` procedure in the README.
- Logging: structured `console.error` with route name; no secrets in logs.
- Rollback: redeploy previous Railway deployment; migrations are forward-only, so schema changes are written to be backward compatible after this rebuild.

## 12. Testing and quality

- Unit (Vitest): `creditsForBatch`, `requiredGivenCount`, `validatePuzzleInput`, `isAdminEmail`, envelope/error mapping, session helpers.
- Integration (Vitest, only when `TEST_DATABASE_URL` set; Docker Postgres locally): accept batch awards n−1 then n; trade rejects wrong given-count; reservation and cancel; redeem balance and concurrency (two parallel redeems, one fails).
- API smoke script (`scripts/smoke.sh`, curl): run against local and production after each deploy.
- Manual checklist per release: guest donate → admin accept → credits visible after sign-up; new trader 2-for-1 → complete → returning 1-for-1; keyboard-only pass through AuthDialog and trade wizard; Lighthouse accessibility ≥ 95.
- CI (`.github/workflows/ci.yml`): `npm ci` → `typecheck` → `lint` → `test` → `build` on push and PR. Node from `.nvmrc` (22).

## 13. Repository cleanup

Delete: `server/`, `.github/workflows/deploy-pages.yml`, `new1-ezgif….mov`, `public/hero.mov`, `Beige and Colorful … .png`, both screenshots, `Wix Website Editor … .pdf`, `public/logo.jpg`, `.eslintrc.json`, removed pages/routes/libs. Move `assets/founder.jpg` and `assets/logo.jpg` into `public/`, remove `assets/`. Re-encode hero: `ffmpeg -i public/hero.mp4 -an -vf scale=1280:-2 -c:v libx264 -crf 28 -preset slow -movflags +faststart` (target < 3 MB) plus a poster frame. Add `.nvmrc`, `eslint.config.mjs`, `.prettierrc`, `vitest.config.ts`, CI workflow; rename package to `papaspuzzles`; add `ADMIN_EMAILS` to `.env.local.example`; rewrite README (setup, env table, business rules, admin, deploy, backup).
Optional, needs explicit approval because it rewrites history and force-pushes: `git filter-repo` to purge ~80 MB of media from past commits.

## 14. Delivery plan

| Phase | Scope | Exit criteria |
|---|---|---|
| 0 | Docs (`overview.md`, this file), repo cleanup, tooling, video | `npm run check` and build pass; CI workflow on GitHub |
| 1 | Schema, constants/types, api/auth/trader/credits libs, unit tests | migration applies on fresh DB and on Railway; CHECKs reject bad values; tests green |
| 2 | Services + all API routes | curl smoke script passes every case in §12; admin routes 401/403 |
| 3 | Tokens, ui primitives, shell, AuthDialog, Toast, AuthContext | sign in/up/forgot from Navbar; dialog keyboard behaviour; contrast verified |
| 4 | Home, About, Explore | spec strings exact; `grep -ri difficulty src` empty; video < 3 MB |
| 5 | Donate, Trade wizard, Credits, My Trades | guest and signed-in flows; tier flips after admin completes a trade; history attaches after sign-up |
| 6 | Admin pages | non-admin 404; all actions; `grep -r "alert(" src` empty |
| 7 | Deploy | `ADMIN_EMAILS` set; production smoke loop; CI green on main |

## 15. Risks and open items

- **Single instance assumptions**: in-memory rate limiting and disk uploads assume one Railway replica. Acceptable now; note for scaling.
- **Guest email trust**: a guest can submit under someone else's email; consequences are limited to that email's donation credits and history, and admin accepts every batch manually. Email verification is a future option.
- **Existing production data**: only test rows; the fresh migration drops them. Confirm before Phase 7.
- **History rewrite** for the media files is deferred pending approval.
- **Founder review needed**: the estimated-credits wording on the donate confirmation, and the four drop-off slots.
