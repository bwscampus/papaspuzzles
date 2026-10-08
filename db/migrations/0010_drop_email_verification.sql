-- Email verification removed (owner decision, 2026-10-08): the one-link step blocked founders
-- and donors more than it protected them. Credits, history and admin unlock on sign-in again.
-- The accepted risk (AUTH-2 / AUTH-8) is recorded in docs/SECURITY-GAPS.md.

drop table if exists public.email_verification_tokens;
alter table public.users drop column if exists email_verified_at;
