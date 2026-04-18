alter table public.player_public_stats
add column if not exists cooking_level integer not null default 1 check (cooking_level >= 1),
add column if not exists cooking_xp bigint not null default 0 check (cooking_xp >= 0);

create index if not exists idx_player_public_stats_cooking_level_xp
on public.player_public_stats (cooking_level desc, cooking_xp desc, updated_at desc);
