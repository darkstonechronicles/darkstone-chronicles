update public.player_public_stats as stats
set
  woodcutting_level = greatest(
    1,
    coalesce(
      nullif(regexp_replace(coalesce(saves.save_data ->> 'woodcuttingLevel', saves.save_data ->> 'woodworkingLevel', '1'), '[^0-9-]', '', 'g'), '')::integer,
      1
    )
  ),
  woodcutting_xp = greatest(
    0,
    coalesce(
      nullif(regexp_replace(coalesce(saves.save_data ->> 'woodcuttingXP', saves.save_data ->> 'woodworkingXP', '0'), '[^0-9-]', '', 'g'), '')::bigint,
      0
    )
  )
from public.player_saves as saves
where saves.user_id = stats.user_id;
