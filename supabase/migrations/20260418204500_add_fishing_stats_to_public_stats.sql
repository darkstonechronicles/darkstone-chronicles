alter table public.player_public_stats
add column if not exists fishing_level integer not null default 1 check (fishing_level >= 1),
add column if not exists fishing_xp bigint not null default 0 check (fishing_xp >= 0);

create index if not exists idx_player_public_stats_fishing_level_xp
on public.player_public_stats (fishing_level desc, fishing_xp desc, updated_at desc);
