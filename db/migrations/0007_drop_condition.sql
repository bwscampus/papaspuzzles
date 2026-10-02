-- Puzzles have no condition (overview.md: name, pieces, theme, photo). No form ever
-- collected it and every row stored 'n/a' (or 'good' from the Firebase import), so the
-- column goes. Forward-only: the previous build reads it, so deploy code and schema together.

alter table public.puzzles drop column condition;
