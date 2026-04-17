alter table public.player_public_stats
add column if not exists dungeons_completed bigint not null default 0 check (dungeons_completed >= 0);

create index if not exists idx_player_public_stats_dungeons_completed
on public.player_public_stats (dungeons_completed desc, updated_at desc);
