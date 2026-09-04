-- Papa's Puzzles schema. See docs/technical-design.md §6.
--
-- This migration replaces the pre-rebuild schema. The preamble drops the old
-- objects so it applies cleanly on the existing database (test data only) and
-- on a fresh one.

drop function if exists public.increment_user_counters(text, integer, integer, integer, text, text);
drop function if exists public.accept_donation_batch(text, text, text);
drop function if exists public.redeem_puzzles(text, text, uuid[]);
drop table if exists public.redemptions cascade;
drop table if exists public.trades cascade;
drop table if exists public.requests cascade;
drop table if exists public.donations cascade;
drop table if exists public.password_reset_tokens cascade;
drop table if exists public.users cascade;

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

create table public.users (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    display_name text,
    password_hash text not null,
    -- Bumped on password reset so existing session cookies stop working.
    session_version integer not null default 1,
    created_at timestamptz not null default now()
);
create unique index users_email_lower_idx on public.users (lower(email));

create table public.password_reset_tokens (
    token_hash text primary key,
    user_id uuid not null references public.users (id) on delete cascade,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
);
create index password_reset_tokens_user_id_idx on public.password_reset_tokens (user_id);

-- ---------------------------------------------------------------------------
-- Donations
-- ---------------------------------------------------------------------------

create table public.donation_batches (
    id uuid primary key default gen_random_uuid(),
    donor_name text not null,
    donor_email text not null,
    status text not null default 'pending_review'
        check (status in ('pending_review', 'accepted', 'rejected')),
    credits_awarded integer,
    was_first_batch boolean,
    reviewed_at timestamptz,
    created_at timestamptz not null default now()
);
create index donation_batches_donor_email_idx on public.donation_batches (lower(donor_email));
create index donation_batches_status_idx on public.donation_batches (status);

-- ---------------------------------------------------------------------------
-- Puzzles (trades reference puzzles and puzzles reference trades, so the
-- second foreign key is added after both tables exist)
-- ---------------------------------------------------------------------------

create table public.puzzles (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(name) between 1 and 120),
    pieces integer not null check (pieces in (100, 300, 500, 1000, 2000)),
    theme text not null
        check (theme in ('Animals', 'Landscape', 'Art', 'Food', 'Cityscape', 'Movies', 'Other')),
    condition text not null check (condition in ('new', 'good', 'fair')),
    image_url text not null,
    status text not null default 'pending_review'
        check (status in ('pending_review', 'available', 'reserved', 'traded', 'claimed', 'rejected')),
    source text not null check (source in ('donation', 'trade', 'admin')),
    donation_batch_id uuid references public.donation_batches (id) on delete set null,
    given_in_trade_id uuid,
    submitted_by_name text,
    submitted_by_email text,
    reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    check ((source = 'donation') = (donation_batch_id is not null)),
    check ((source = 'trade') = (given_in_trade_id is not null))
);
create index puzzles_status_idx on public.puzzles (status);
create index puzzles_theme_idx on public.puzzles (theme);
create index puzzles_pieces_idx on public.puzzles (pieces);
create index puzzles_donation_batch_id_idx on public.puzzles (donation_batch_id);
create index puzzles_given_in_trade_id_idx on public.puzzles (given_in_trade_id);

-- ---------------------------------------------------------------------------
-- Trades
-- ---------------------------------------------------------------------------

create table public.trades (
    id uuid primary key default gen_random_uuid(),
    trader_name text not null,
    trader_email text not null,
    tier text not null check (tier in ('new', 'returning')),
    received_puzzle_id uuid not null references public.puzzles (id),
    dropoff_date date not null,
    dropoff_slot text not null check (dropoff_slot in ('10:00', '12:00', '14:00', '16:00')),
    status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
    completed_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz not null default now()
);
create index trades_trader_email_idx on public.trades (lower(trader_email));
create index trades_status_idx on public.trades (status);
create index trades_received_puzzle_id_idx on public.trades (received_puzzle_id);

alter table public.puzzles
    add constraint puzzles_given_in_trade_id_fkey
    foreign key (given_in_trade_id) references public.trades (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Credits
-- ---------------------------------------------------------------------------

create table public.redemptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users (id),
    email text not null,
    credits_spent integer not null check (credits_spent > 0),
    status text not null default 'pending_pickup'
        check (status in ('pending_pickup', 'fulfilled', 'cancelled')),
    fulfilled_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz not null default now()
);
create index redemptions_email_idx on public.redemptions (lower(email));
create index redemptions_status_idx on public.redemptions (status);

create table public.redemption_puzzles (
    redemption_id uuid not null references public.redemptions (id) on delete cascade,
    puzzle_id uuid not null references public.puzzles (id),
    primary key (redemption_id, puzzle_id),
    unique (puzzle_id)
);

-- Ledger keyed by email so guests accrue credits before they have an account.
create table public.credit_entries (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    delta integer not null check (delta <> 0),
    reason text not null
        check (reason in ('donation_accepted', 'redemption', 'redemption_cancelled', 'admin_adjustment')),
    donation_batch_id uuid references public.donation_batches (id) on delete set null,
    redemption_id uuid references public.redemptions (id) on delete set null,
    note text,
    created_at timestamptz not null default now()
);
create index credit_entries_email_idx on public.credit_entries (lower(email));
create unique index credit_entries_batch_award_idx
    on public.credit_entries (donation_batch_id) where reason = 'donation_accepted';

-- ---------------------------------------------------------------------------
-- Read-only helpers
-- ---------------------------------------------------------------------------

create view public.trader_activity as
    select lower(trader_email) as email from public.trades where status = 'completed'
    union
    select lower(donor_email) from public.donation_batches where status = 'accepted';

create function public.is_returning_trader(p_email text) returns boolean
language sql stable
as $$
    select exists (select 1 from public.trader_activity where email = lower(p_email));
$$;

create function public.credit_balance(p_email text) returns integer
language sql stable
as $$
    select coalesce(sum(delta), 0)::integer from public.credit_entries where lower(email) = lower(p_email);
$$;
