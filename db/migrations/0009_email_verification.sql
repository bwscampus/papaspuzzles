-- Email verification (Production Standard AUTH-2 / AUTH-8).
-- Credits, history, and admin rights are all keyed by email, so an account only gets them once
-- its owner proves they control that inbox. Existing accounts are deliberately NOT backfilled as
-- verified: anyone could have registered someone else's address before this migration, so every
-- account (admins included) verifies once via the link. Completing a password reset also verifies,
-- because the reset link was delivered to the same inbox.

alter table public.users add column email_verified_at timestamptz;

create table public.email_verification_tokens (
    token_hash text primary key,
    user_id uuid not null references public.users (id) on delete cascade,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
);
create index email_verification_tokens_user_id_idx on public.email_verification_tokens (user_id);
