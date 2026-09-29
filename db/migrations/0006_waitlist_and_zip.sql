-- LA-only service area: a waitlist for visitors outside it, and the ZIP given on each submission.
-- 0004 was added and reverted, so this file is numbered 0006.

create table public.waitlist (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    zip text not null check (zip ~ '^[0-9]{5}$'),
    source text not null default 'page' check (source in ('trade', 'donate', 'page')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create unique index waitlist_email_lower_idx on public.waitlist (lower(email));
create index waitlist_zip_idx on public.waitlist (zip);

-- Nullable: rows from before the ZIP check have none.
alter table public.trades add column zip text check (zip ~ '^[0-9]{5}$');
alter table public.donation_batches add column zip text check (zip ~ '^[0-9]{5}$');
