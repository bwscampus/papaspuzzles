-- Piece count is any whole number. The fixed sizes (100/300/500/1000/2000) were a UI
-- convenience that real inventory does not fit. 0004 was reverted and 0007 dropped
-- condition, so this is 0008. Existing rows all satisfy the new bounds.

alter table public.puzzles drop constraint puzzles_pieces_check;
alter table public.puzzles add constraint puzzles_pieces_check check (pieces between 1 and 50000);
