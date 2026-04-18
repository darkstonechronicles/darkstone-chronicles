alter table public.player_public_stats
add column if not exists carpentry_level integer not null default 1 check (carpentry_level >= 1),
add column if not exists carpentry_xp bigint not null default 0 check (carpentry_xp >= 0);

create index if not exists idx_player_public_stats_carpentry_level_xp
on public.player_public_stats (carpentry_level desc, carpentry_xp desc, updated_at desc);
