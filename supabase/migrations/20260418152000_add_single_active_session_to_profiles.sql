alter table public.profiles
add column if not exists active_session_id text not null default '',
add column if not exists active_session_claimed_at timestamptz;

create index if not exists idx_profiles_active_session_id
on public.profiles (active_session_id)
where active_session_id <> '';
