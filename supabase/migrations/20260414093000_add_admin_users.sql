create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_users enable row level security;

create policy "admin_users_select_self"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id);
