alter table public.player_public_stats
add column if not exists forge_level integer not null default 1 check (forge_level >= 1),
add column if not exists forge_xp bigint not null default 0 check (forge_xp >= 0);

create index if not exists idx_player_public_stats_forge_level_xp
on public.player_public_stats (forge_level desc, forge_xp desc, updated_at desc);
