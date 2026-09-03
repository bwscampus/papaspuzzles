# Papa's Puzzles

A simple marketplace for families to donate, trade, and request old puzzles.

## Prerequisites
- Node.js (v18 or higher recommended)
- npm

## Setup Instructions (Local)

### 1. Install and run

```bash
npm install
npm run dev
```
The app starts on `http://localhost:3000`.

### 2. Supabase configuration
Create `.env.local` from [.env.local.example](.env.local.example). Values come from the Supabase
dashboard under **Project Settings → API** (project `papaspuzzles`).

Required client variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Required server variable (API routes only, never exposed to the browser):
- `SUPABASE_SECRET_KEY`

Alternatively, pull them from Vercel: `vercel env pull .env.local`.

### 3. Database schema
The schema lives in [supabase/migrations](supabase/migrations) and is managed with the Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Tables: `users`, `donations`, `requests`, `trades`, `redemptions`. Puzzle photos are stored in the
public `puzzles` storage bucket. Multi-step operations (accepting a donation batch, redeeming credits,
bumping user counters) are Postgres functions so they run atomically.

## Features
- **Landing Page**: Overview of the platform.
- **Explore**: Browse listings and request a swap.
- **Donate**: Submit a batch of puzzles for admin review; credits are awarded on acceptance.
- **Redeem**: Spend credits on available puzzles.
- **Request**: Form to request puzzles.
- **Admin Panel**: Review donations, requests, trades, and redemptions; add inventory.
  - URL: `/admin`
  - Auth is currently disabled for alpha testing.

## Production (Vercel)
- Vercel project: `papaspuzzles` (team BCIL). Production URL: https://papaspuzzles-rouge.vercel.app
- Set the three Supabase env vars in Vercel for Production, Preview, and Development.
- Supabase Auth **Site URL** and **Redirect URLs** must include the production domain so password
  reset emails link back to `/reset-password`. They are managed in [supabase/config.toml](supabase/config.toml)
  and applied with `supabase config push`.
- Email confirmation on sign-up is disabled (users are signed in immediately, matching the original
  Firebase behaviour). Supabase's built-in SMTP is rate limited; configure custom SMTP before launch.
- Smoke test key flows: Explore → Trade, Admin add inventory, Donation submit → Accept batch, Redeem.

## Tech Stack
- **Frontend**: Next.js, React, Tailwind CSS, Lucide Icons
- **Backend**: Next.js API Routes
- **Database / Auth / Storage**: Supabase (Postgres, Supabase Auth, Supabase Storage)
