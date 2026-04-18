alter table public.player_public_stats
add column if not exists herbalism_level integer not null default 1 check (herbalism_level >= 1),
add column if not exists herbalism_xp bigint not null default 0 check (herbalism_xp >= 0);

create index if not exists idx_player_public_stats_herbalism_level_xp
on public.player_public_stats (herbalism_level desc, herbalism_xp desc, updated_at desc);
