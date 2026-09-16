-- Credits as one ledger. Everyone starts at -1. Each approved puzzle you submitted is +1,
-- each puzzle you take in a trade is -1 (charged when the trade is requested, refunded if
-- it is cancelled). Credit pick-ups keep charging at request and refunding on cancel.

alter table public.credit_entries add column puzzle_id uuid references public.puzzles (id) on delete set null;
alter table public.credit_entries add column trade_id uuid references public.trades (id) on delete set null;
alter table public.credit_entries drop constraint credit_entries_reason_check;
alter table public.credit_entries add constraint credit_entries_reason_check check (
    reason in ('donation_accepted', 'redemption', 'redemption_cancelled', 'admin_adjustment',
               'puzzle_added', 'puzzle_removed', 'trade_taken', 'trade_cancelled')
);
create index credit_entries_puzzle_id_idx on public.credit_entries (puzzle_id);
create unique index credit_entries_trade_taken_idx on public.credit_entries (trade_id) where reason = 'trade_taken';
create unique index credit_entries_trade_cancelled_idx on public.credit_entries (trade_id) where reason = 'trade_cancelled';

-- Per-puzzle credits replace the old per-batch award.
delete from public.credit_entries where reason = 'donation_accepted';
insert into public.credit_entries (email, delta, reason, puzzle_id)
select submitted_by_email, 1, 'puzzle_added', id
from public.puzzles
where submitted_by_email is not null
  and status in ('available', 'reserved', 'traded', 'claimed');
-- Trades charge one credit when requested; cancelled trades net to zero so they are skipped.
insert into public.credit_entries (email, delta, reason, trade_id)
select trader_email, -1, 'trade_taken', id
from public.trades
where status in ('pending', 'completed');

create or replace function public.credit_balance(p_email text) returns integer
language sql stable
as $$
    select (-1 + coalesce(sum(delta), 0))::integer
    from public.credit_entries
    where lower(email) = lower(p_email);
$$;

create or replace function public.is_returning_trader(p_email text) returns boolean
language sql stable
as $$
    select public.credit_balance(p_email) >= 0;
$$;
