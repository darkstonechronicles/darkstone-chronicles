create table if not exists public.player_save_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_user_id uuid references public.profiles (id) on delete set null,
  reason text not null default 'manual',
  save_data jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_player_save_backups_user_time
on public.player_save_backups (user_id, created_at desc);

alter table public.player_save_backups enable row level security;

drop policy if exists "player_save_backups_admin_select" on public.player_save_backups;
create policy "player_save_backups_admin_select"
on public.player_save_backups
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);
