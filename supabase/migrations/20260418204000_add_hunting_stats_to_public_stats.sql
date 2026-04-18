alter table public.player_public_stats
add column if not exists hunting_level integer not null default 1 check (hunting_level >= 1),
add column if not exists hunting_xp bigint not null default 0 check (hunting_xp >= 0);

create index if not exists idx_player_public_stats_hunting_level_xp
on public.player_public_stats (hunting_level desc, hunting_xp desc, updated_at desc);
