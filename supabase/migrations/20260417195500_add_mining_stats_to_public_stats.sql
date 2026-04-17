alter table public.player_public_stats
add column if not exists mining_level integer not null default 1 check (mining_level >= 1),
add column if not exists mining_xp bigint not null default 0 check (mining_xp >= 0);

create index if not exists idx_player_public_stats_mining_level_xp
on public.player_public_stats (mining_level desc, mining_xp desc, updated_at desc);
