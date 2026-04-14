alter table public.profiles
add column if not exists last_seen_at timestamptz,
add column if not exists last_seen_page text not null default '';

create index if not exists idx_profiles_last_seen_at
on public.profiles (last_seen_at desc);
