-- Sign in with Google. Accounts created through Google have no password; existing
-- password accounts are linked by email the first time that email signs in with Google.
alter table public.users alter column password_hash drop not null;
alter table public.users add column google_sub text;
create unique index users_google_sub_idx on public.users (google_sub) where google_sub is not null;
