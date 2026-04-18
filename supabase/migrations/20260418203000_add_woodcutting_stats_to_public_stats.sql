alter table public.player_public_stats
add column if not exists woodcutting_level integer not null default 1 check (woodcutting_level >= 1),
add column if not exists woodcutting_xp bigint not null default 0 check (woodcutting_xp >= 0);

create index if not exists idx_player_public_stats_woodcutting_level_xp
on public.player_public_stats (woodcutting_level desc, woodcutting_xp desc, updated_at desc);
