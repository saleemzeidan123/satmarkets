-- SM-P0-002: audit trail for requirement interests.
-- Additive only: two nullable FK columns so every interest row records WHICH
-- authenticated app user and account submitted it. No policy/RLS change here.
alter table public.requirement_interests
  add column if not exists user_id uuid references public.users(id),
  add column if not exists account_id uuid references public.accounts(id);

create index if not exists requirement_interests_account_id_idx
  on public.requirement_interests(account_id);
create index if not exists requirement_interests_user_id_idx
  on public.requirement_interests(user_id);
