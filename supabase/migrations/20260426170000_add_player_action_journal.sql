create table if not exists public.player_action_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action_id text not null,
  action_kind text not null,
  source_page text not null default '',
  status text not null default 'committed',
  base_revision bigint not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_player_action_journal_user_action
on public.player_action_journal (user_id, action_id);

create index if not exists idx_player_action_journal_user_time
on public.player_action_journal (user_id, created_at desc);

alter table public.player_action_journal enable row level security;

drop policy if exists "player_action_journal_select_self" on public.player_action_journal;
create policy "player_action_journal_select_self"
on public.player_action_journal
for select
to authenticated
using (auth.uid() = user_id);
