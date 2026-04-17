update public.player_public_stats as stats
set dungeons_completed = greatest(
  0,
  coalesce(
    nullif(
      regexp_replace(
        coalesce(saves.save_data #>> '{stats,total,dungeonsCompleted}', '0'),
        '[^0-9-]',
        '',
        'g'
      ),
      ''
    )::bigint,
    0
  )
)
from public.player_saves as saves
where saves.user_id = stats.user_id;
