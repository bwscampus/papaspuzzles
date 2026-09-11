-- Admin-added inventory does not record a condition; it stores 'n/a'.
alter table public.puzzles drop constraint puzzles_condition_check;
alter table public.puzzles
    add constraint puzzles_condition_check check (condition in ('new', 'good', 'fair', 'n/a'));
