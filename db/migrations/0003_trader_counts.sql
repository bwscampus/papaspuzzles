-- Trader tier is now based on puzzles added to the site, not on completed trades.
-- A puzzle counts as added once the admin has approved it (any status past review).
-- Taken = puzzles received through completed trades plus fulfilled credit pick-ups.

drop function if exists public.is_returning_trader(text);
drop view if exists public.trader_activity;

create function public.puzzles_added(p_email text) returns integer
language sql stable
as $$
    select count(*)::integer
    from public.puzzles
    where lower(submitted_by_email) = lower(p_email)
      and status in ('available', 'reserved', 'traded', 'claimed');
$$;

create function public.puzzles_taken(p_email text) returns integer
language sql stable
as $$
    select (
        (select count(*) from public.trades
          where lower(trader_email) = lower(p_email) and status = 'completed')
      + (select count(*) from public.redemption_puzzles rp
          join public.redemptions r on r.id = rp.redemption_id
          where lower(r.email) = lower(p_email) and r.status = 'fulfilled')
    )::integer;
$$;

create function public.is_returning_trader(p_email text) returns boolean
language sql stable
as $$
    select public.puzzles_added(p_email) > 0;
$$;

create index if not exists puzzles_submitted_by_email_idx on public.puzzles (lower(submitted_by_email));
