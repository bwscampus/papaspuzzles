-- Puzzles given away to our charity partner. A donated puzzle is off Explore and cannot be
-- traded or picked up (both require status = 'available'). The admin can put it back, which
-- returns it to 'available'. The contributor keeps the credit they earned for it.

alter table public.puzzles drop constraint puzzles_status_check;
alter table public.puzzles add constraint puzzles_status_check check (
    status in ('pending_review', 'available', 'reserved', 'traded', 'claimed', 'rejected', 'donated')
);

create or replace function public.puzzles_added(p_email text) returns integer
language sql stable
as $$
    select count(*)::integer
    from public.puzzles
    where lower(submitted_by_email) = lower(p_email)
      and status in ('available', 'reserved', 'traded', 'claimed', 'donated');
$$;

-- November 2026 charity drop-off. Only puzzles still available are moved, so this is a no-op on
-- databases that do not have these rows.
update public.puzzles set status = 'donated'
where status = 'available'
  and id in (
    '32bc39f2-7f49-4e12-a222-921ab50d1db4', -- Paris City of Lights
    '677d6ec6-58b0-4304-a0c7-65db86e38564', -- Big Sur
    'fc8d64a7-00dc-41c9-bf98-245a480fc197', -- Seattle
    '5d4bbd6f-ada7-45bb-8163-0e9de8833c5e', -- Ravensburger Puzzle - Wild Animals
    '103191ad-497f-436f-97e1-448462b3755e', -- Atlantis
    'dc88c0f9-687d-40e2-b6e0-dc12f5f5a8cb', -- Bunny Daydream
    'e82d2756-e104-4f30-8f25-b050afc7b4a1', -- Foraging
    '07479fb3-e609-4b19-b49f-e43dbd7e35c5', -- Brilliant Butterflies
    '4e6cef35-ed8b-4994-aa2d-7bae0bbefb4b', -- A Day at the Races
    '92c3dabc-88e6-48e3-bc84-20ceab6a60e7', -- Hawaii Food Truck Festival
    '33978820-5524-42b8-8b40-60bbecc24705', -- Your World
    'c9638516-a825-4198-84d9-1085fee75be6', -- Star Wars: Mandalorian
    'ef901fbe-eafa-4064-8f19-bbb752c17433', -- Museum At Midnight
    '2b9d0d3a-1785-43c3-9f89-8776a16eefc6', -- Salt Lake Winter
    'dcb1b1e6-5839-4f7b-9261-61410c4e2509', -- Cats & Flowers
    'ecef319b-e76e-4dfb-93f7-b0618e8fae4f', -- Stockholm
    '750ae760-bd57-4e2f-8d73-d69ca8cb2949', -- Sequoia
    'd560dea3-d1af-4ac9-890f-b7dec493f9ad'  -- Amish Country
  );

-- Three of those puzzles were listed twice. The copy above became the donated one; remove the
-- duplicate listing, unless a trade or pickup has touched it since.
delete from public.puzzles p
where p.status = 'available'
  and p.id in (
    'c4a500c9-af02-40b2-90ae-1f72bea3f814', -- Brilliant Butterflies (duplicate)
    '4104624a-46bc-415d-a269-880ffeaa1ec7', -- A Day at the Races (duplicate)
    '5f3ce3d7-03b9-4bfc-922a-152838231c07'  -- Museum at Midnight (duplicate)
  )
  and not exists (select 1 from public.trades t where t.received_puzzle_id = p.id)
  and not exists (select 1 from public.redemption_puzzles rp where rp.puzzle_id = p.id);
