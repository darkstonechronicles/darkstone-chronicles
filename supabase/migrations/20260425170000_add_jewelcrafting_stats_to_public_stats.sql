alter table public.player_public_stats
add column if not exists jewelcrafting_level integer not null default 1 check (jewelcrafting_level >= 1),
add column if not exists jewelcrafting_xp bigint not null default 0 check (jewelcrafting_xp >= 0);

create index if not exists idx_player_public_stats_jewelcrafting_level_xp
on public.player_public_stats (jewelcrafting_level desc, jewelcrafting_xp desc, updated_at desc);
