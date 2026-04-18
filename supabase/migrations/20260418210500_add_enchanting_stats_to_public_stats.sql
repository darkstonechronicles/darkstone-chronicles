alter table public.player_public_stats
add column if not exists enchanting_level integer not null default 1 check (enchanting_level >= 1),
add column if not exists enchanting_xp bigint not null default 0 check (enchanting_xp >= 0);

create index if not exists idx_player_public_stats_enchanting_level_xp
on public.player_public_stats (enchanting_level desc, enchanting_xp desc, updated_at desc);
