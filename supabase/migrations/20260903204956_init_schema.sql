-- Papa's Puzzles: initial schema (migrated from Firebase Firestore)

create table public.users (
    uid text primary key,
    email text,
    display_name text,
    completed_trades_count integer not null default 0,
    credits integer not null default 0,
    donation_batches_accepted integer not null default 0,
    created_at timestamptz not null default now()
);
create index users_email_idx on public.users (email);

create table public.donations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    pieces integer,
    difficulty text not null default 'medium',
    theme text not null default '',
    condition text not null default 'good',
    email text not null,
    image_url text,
    status text not null default 'pending_admin_review',
    uid text,
    batch_id text,
    source text,
    claimed_by_uid text,
    created_at timestamptz not null default now()
);
create index donations_status_idx on public.donations (status);
create index donations_batch_id_idx on public.donations (batch_id);

create table public.requests (
    id uuid primary key default gen_random_uuid(),
    type text not null,
    pieces text,
    difficulty text,
    email text not null,
    status text not null default 'pending',
    created_at timestamptz not null default now()
);

create table public.trades (
    id uuid primary key default gen_random_uuid(),
    user_name text not null,
    user_email text not null,
    uid text,
    given_donation_ids uuid[] not null default '{}',
    received_donation_id uuid references public.donations (id) on delete set null,
    dropoff_datetime text,
    status text not null default 'pending',
    mode text not null default 'swap',
    created_at timestamptz not null default now(),
    completed_at timestamptz
);
create index trades_user_email_idx on public.trades (user_email);

create table public.redemptions (
    id uuid primary key default gen_random_uuid(),
    uid text not null,
    user_email text,
    donation_ids uuid[] not null default '{}',
    donation_names text[] not null default '{}',
    credits_spent integer not null default 0,
    status text not null default 'pending_pickup',
    created_at timestamptz not null default now()
);

-- All access goes through Next.js API routes using the service-role key.
-- RLS with no policies blocks direct anon/authenticated access.
alter table public.users enable row level security;
alter table public.donations enable row level security;
alter table public.requests enable row level security;
alter table public.trades enable row level security;
alter table public.redemptions enable row level security;

-- Public bucket for puzzle photos (uploads happen server-side).
insert into storage.buckets (id, name, public)
values ('puzzles', 'puzzles', true)
on conflict (id) do nothing;

-- Upsert a user row and atomically bump its counters.
create or replace function public.increment_user_counters(
    p_uid text,
    p_credits integer default 0,
    p_batches integer default 0,
    p_trades integer default 0,
    p_email text default null,
    p_display_name text default null
) returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
    result public.users;
begin
    insert into public.users as u (uid, email, display_name, credits, donation_batches_accepted, completed_trades_count)
    values (p_uid, p_email, p_display_name, p_credits, p_batches, p_trades)
    on conflict (uid) do update set
        credits = u.credits + excluded.credits,
        donation_batches_accepted = u.donation_batches_accepted + excluded.donation_batches_accepted,
        completed_trades_count = u.completed_trades_count + excluded.completed_trades_count,
        email = coalesce(excluded.email, u.email),
        display_name = coalesce(excluded.display_name, u.display_name)
    returning * into result;
    return result;
end;
$$;

-- Admin accepts a donation batch: publish puzzles + award credits in one transaction.
create or replace function public.accept_donation_batch(
    p_batch_id text,
    p_uid text default null,
    p_email text default null
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    v_count integer;
    v_user public.users;
    v_first boolean;
    v_credits integer;
    v_target_uid text;
begin
    select count(*) into v_count
    from public.donations
    where batch_id = p_batch_id and status = 'pending_admin_review';

    if v_count = 0 then
        raise exception 'No pending puzzles found for this batch' using errcode = 'P0002';
    end if;

    if p_uid is not null then
        select * into v_user from public.users where uid = p_uid;
    elsif p_email is not null then
        select * into v_user from public.users where email = p_email limit 1;
    end if;

    v_first := coalesce(v_user.donation_batches_accepted, 0) = 0;
    -- First batch: donate 2 -> 1 credit, donate 10 -> 9 credits. Repeat donors: 1:1.
    v_credits := case when v_first then greatest(0, v_count - 1) else v_count end;

    update public.donations
    set status = 'available'
    where batch_id = p_batch_id and status = 'pending_admin_review';

    v_target_uid := coalesce(p_uid, v_user.uid);
    if v_credits > 0 and v_target_uid is not null then
        insert into public.users as u (uid, email, credits, donation_batches_accepted)
        values (v_target_uid, p_email, v_credits, 1)
        on conflict (uid) do update set
            credits = u.credits + excluded.credits,
            donation_batches_accepted = u.donation_batches_accepted + 1;
    end if;

    return json_build_object(
        'puzzlesPublished', v_count,
        'creditsAwarded', v_credits,
        'isFirstTimeDonor', v_first
    );
end;
$$;

-- User spends credits on puzzles: verify, claim, deduct, record, atomically.
create or replace function public.redeem_puzzles(
    p_uid text,
    p_user_email text,
    p_donation_ids uuid[]
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    v_credits integer;
    v_need integer := coalesce(array_length(p_donation_ids, 1), 0);
    v_available integer;
    v_names text[];
    v_redemption_id uuid;
begin
    if v_need = 0 then
        raise exception 'donationIds are required' using errcode = 'P0001';
    end if;

    select credits into v_credits from public.users where uid = p_uid for update;
    if not found then
        raise exception 'User not found' using errcode = 'P0002';
    end if;
    if v_credits < v_need then
        raise exception 'Not enough credits. You have %, need %.', v_credits, v_need using errcode = 'P0001';
    end if;

    select count(*) into v_available
    from public.donations
    where id = any(p_donation_ids) and status = 'available';
    if v_available <> v_need then
        raise exception 'One or more puzzles are no longer available. Please refresh and try again.' using errcode = 'P0003';
    end if;

    select array_agg(d.name order by x.ord) into v_names
    from unnest(p_donation_ids) with ordinality as x(id, ord)
    join public.donations d on d.id = x.id;

    update public.donations
    set status = 'claimed', claimed_by_uid = p_uid
    where id = any(p_donation_ids);

    update public.users set credits = credits - v_need where uid = p_uid;

    insert into public.redemptions (uid, user_email, donation_ids, donation_names, credits_spent)
    values (p_uid, p_user_email, p_donation_ids, v_names, v_need)
    returning id into v_redemption_id;

    return json_build_object('redemptionId', v_redemption_id);
end;
$$;

-- Only the service role may call these.
revoke execute on function public.increment_user_counters(text, integer, integer, integer, text, text) from public, anon, authenticated;
revoke execute on function public.accept_donation_batch(text, text, text) from public, anon, authenticated;
revoke execute on function public.redeem_puzzles(text, text, uuid[]) from public, anon, authenticated;
