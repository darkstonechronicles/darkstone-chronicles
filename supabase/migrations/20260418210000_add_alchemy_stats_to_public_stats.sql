alter table public.player_public_stats
add column if not exists alchemy_level integer not null default 1 check (alchemy_level >= 1),
add column if not exists alchemy_xp bigint not null default 0 check (alchemy_xp >= 0);

create index if not exists idx_player_public_stats_alchemy_level_xp
on public.player_public_stats (alchemy_level desc, alchemy_xp desc, updated_at desc);
