create or replace function public.get_public_player_profile(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_stats public.player_public_stats%rowtype;
  v_save jsonb := '{}'::jsonb;
  v_row public.player_saves%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Authentication required.');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_target_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Player not found.');
  end if;

  select *
  into v_stats
  from public.player_public_stats
  where user_id = p_target_user_id;

  select *
  into v_row
  from public.player_saves
  where user_id = p_target_user_id;

  if found then
    v_save := coalesce(v_row.save_data, '{}'::jsonb);
  end if;

  return jsonb_build_object(
    'ok', true,
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'name', coalesce(nullif(v_profile.display_name, ''), nullif(v_stats.hero_name, ''), 'Hero'),
      'avatarUrl', coalesce(nullif(v_profile.avatar_url, ''), nullif(v_save->>'heroPortrait', ''), 'images/hero.png'),
      'lastSeenAt', v_profile.last_seen_at,
      'lastSeenPage', coalesce(v_profile.last_seen_page, '')
    ),
    'overview', jsonb_build_object(
      'heroName', coalesce(nullif(v_profile.display_name, ''), nullif(v_stats.hero_name, ''), nullif(v_save->>'heroName', ''), nullif(v_save->>'playerName', ''), 'Hero'),
      'heroLevel', greatest(1, coalesce(v_stats.hero_level, nullif(v_save->>'heroLevel', '')::integer, 1)),
      'heroXP', greatest(0, coalesce(v_stats.hero_xp, nullif(v_save->>'heroXP', '')::bigint, 0)),
      'combatPower', greatest(0, coalesce(v_stats.combat_power, nullif(v_save->>'attackTotal', '')::bigint + nullif(v_save->>'defenseTotal', '')::bigint, nullif(v_save->>'heroAtk', '')::bigint + nullif(v_save->>'heroDef', '')::bigint, nullif(v_save->>'heroAttack', '')::bigint + nullif(v_save->>'heroDefense', '')::bigint, 0)),
      'totalGold', greatest(0, coalesce(v_stats.total_gold, nullif(v_save->>'gold', '')::bigint, 0)),
      'dungeonsCompleted', greatest(0, coalesce(v_stats.dungeons_completed, nullif(v_save#>>'{stats,total,dungeonsCompleted}', '')::bigint, 0)),
      'heroHP', greatest(0, coalesce(nullif(v_save->>'heroHP', '')::bigint, 0)),
      'heroHPMax', greatest(0, coalesce(nullif(v_save->>'heroHPMax', '')::bigint, 0)),
      'stamina', greatest(0, coalesce(nullif(v_save->>'stamina', '')::bigint, 0)),
      'staminaMax', greatest(0, coalesce(nullif(v_save->>'staminaMax', '')::bigint, 0)),
      'heroAttack', greatest(0, coalesce(nullif(v_save->>'attackTotal', '')::bigint, nullif(v_save->>'heroAtk', '')::bigint, nullif(v_save->>'heroAttack', '')::bigint, 0)),
      'heroDefense', greatest(0, coalesce(nullif(v_save->>'defenseTotal', '')::bigint, nullif(v_save->>'heroDef', '')::bigint, nullif(v_save->>'heroDefense', '')::bigint, 0)),
      'stats', jsonb_build_object(
        'mining', jsonb_build_object('level', greatest(1, coalesce(v_stats.mining_level, nullif(v_save->>'miningLevel', '')::integer, 1)), 'xp', greatest(0, coalesce(v_stats.mining_xp, nullif(v_save->>'miningXP', '')::bigint, 0))),
        'forge', jsonb_build_object('level', greatest(1, coalesce(v_stats.forge_level, nullif(v_save->>'blacksmithLevel', '')::integer, nullif(v_save->>'forgeLevel', '')::integer, 1)), 'xp', greatest(0, coalesce(v_stats.forge_xp, nullif(v_save->>'blacksmithXP', '')::bigint, nullif(v_save->>'forgeXP', '')::bigint, 0))),
        'woodcutting', jsonb_build_object('level', greatest(1, coalesce(v_stats.woodcutting_level, nullif(v_save->>'woodcuttingLevel', '')::integer, nullif(v_save->>'woodworkingLevel', '')::integer, 1)), 'xp', greatest(0, coalesce(v_stats.woodcutting_xp, nullif(v_save->>'woodcuttingXP', '')::bigint, nullif(v_save->>'woodworkingXP', '')::bigint, 0))),
        'carpentry', jsonb_build_object('level', greatest(1, coalesce(v_stats.carpentry_level, nullif(v_save->>'carpentryLevel', '')::integer, 1)), 'xp', greatest(0, coalesce(v_stats.carpentry_xp, nullif(v_save->>'carpentryXP', '')::bigint, 0))),
        'hunting', jsonb_build_object('level', greatest(1, coalesce(v_stats.hunting_level, nullif(v_save->>'huntingLevel', '')::integer, 1)), 'xp', greatest(0, coalesce(v_stats.hunting_xp, nullif(v_save->>'huntingXP', '')::bigint, 0))),
        'fishing', jsonb_build_object('level', greatest(1, coalesce(v_stats.fishing_level, nullif(v_save->>'fishingLevel', '')::integer, 1)), 'xp', greatest(0, coalesce(v_stats.fishing_xp, nullif(v_save->>'fishingXP', '')::bigint, 0))),
        'cooking', jsonb_build_object('level', greatest(1, coalesce(v_stats.cooking_level, nullif(v_save->>'cookingLevel', '')::integer, 1)), 'xp', greatest(0, coalesce(v_stats.cooking_xp, nullif(v_save->>'cookingXP', '')::bigint, 0))),
        'herbalism', jsonb_build_object('level', greatest(1, coalesce(v_stats.herbalism_level, nullif(v_save->>'herbalismLevel', '')::integer, 1)), 'xp', greatest(0, coalesce(v_stats.herbalism_xp, nullif(v_save->>'herbalismXP', '')::bigint, 0))),
        'alchemy', jsonb_build_object('level', greatest(1, coalesce(v_stats.alchemy_level, nullif(v_save->>'alchemyLevel', '')::integer, 1)), 'xp', greatest(0, coalesce(v_stats.alchemy_xp, nullif(v_save->>'alchemyXP', '')::bigint, 0))),
        'enchanting', jsonb_build_object('level', greatest(1, coalesce(v_stats.enchanting_level, nullif(v_save->>'enchantingLevel', '')::integer, 1)), 'xp', greatest(0, coalesce(v_stats.enchanting_xp, nullif(v_save->>'enchantingXP', '')::bigint, 0)))
      )
    ),
    'equipment', coalesce(v_save->'equipment', '{}'::jsonb)
  );
end;
$$;

grant execute on function public.get_public_player_profile(uuid) to authenticated;
