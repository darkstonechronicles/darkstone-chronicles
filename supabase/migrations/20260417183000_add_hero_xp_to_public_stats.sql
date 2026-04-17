alter table public.player_public_stats
add column if not exists hero_xp bigint not null default 0 check (hero_xp >= 0);

create index if not exists idx_player_public_stats_hero_level_xp
on public.player_public_stats (hero_level desc, hero_xp desc, updated_at desc);
