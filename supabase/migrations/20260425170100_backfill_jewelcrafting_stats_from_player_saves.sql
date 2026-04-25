update public.player_public_stats as stats
set
  jewelcrafting_level = greatest(
    1,
    coalesce(
      nullif(regexp_replace(coalesce(saves.save_data ->> 'jewelcraftingLevel', '1'), '[^0-9-]', '', 'g'), '')::integer,
      1
    )
  ),
  jewelcrafting_xp = greatest(
    0,
    coalesce(
      nullif(regexp_replace(coalesce(saves.save_data ->> 'jewelcraftingXP', '0'), '[^0-9-]', '', 'g'), '')::bigint,
      0
    )
  )
from public.player_saves as saves
where saves.user_id = stats.user_id;
