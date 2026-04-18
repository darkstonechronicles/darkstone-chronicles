create or replace function public.inventory_item_stack_key(p_item jsonb)
returns text
language sql
immutable
as $$
  select concat_ws(
    '::',
    coalesce(p_item ->> 'type', ''),
    coalesce(p_item ->> 'name', ''),
    coalesce(p_item ->> 'baseName', ''),
    coalesce(p_item ->> 'setId', ''),
    coalesce(p_item ->> 'slot', ''),
    coalesce(p_item ->> 'reqLevel', '1'),
    coalesce(p_item ->> 'atk', '0'),
    coalesce(p_item ->> 'def', '0'),
    coalesce(p_item ->> 'rarity', ''),
    coalesce(p_item ->> 'img', ''),
    coalesce(p_item ->> 'upg', '0')
  );
$$;

create or replace function public.inventory_used_units(p_inventory jsonb)
returns bigint
language sql
immutable
as $$
  select coalesce(sum(greatest(1, coalesce(nullif(item ->> 'quantity', '')::bigint, nullif(item ->> 'qty', '')::bigint, 1))), 0)
  from jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(p_inventory, '[]'::jsonb)) = 'array' then coalesce(p_inventory, '[]'::jsonb)
      else '[]'::jsonb
    end
  ) as item;
$$;

create or replace function public.send_inventory_item(
  p_recipient_name text,
  p_item jsonb,
  p_quantity integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid := auth.uid();
  v_recipient_name text := btrim(coalesce(p_recipient_name, ''));
  v_recipient_id uuid;
  v_sender_save_row public.player_saves%rowtype;
  v_recipient_save_row public.player_saves%rowtype;
  v_sender_save jsonb;
  v_recipient_save jsonb;
  v_sender_inventory jsonb;
  v_recipient_inventory jsonb;
  v_new_sender_inventory jsonb := '[]'::jsonb;
  v_new_recipient_inventory jsonb := '[]'::jsonb;
  v_item jsonb := coalesce(p_item, '{}'::jsonb);
  v_item_key text;
  v_qty integer := greatest(1, coalesce(p_quantity, 1));
  v_found boolean := false;
  v_sender_entry jsonb;
  v_recipient_entry jsonb;
  v_sender_entry_qty integer;
  v_recipient_entry_qty integer;
  v_transfer_item jsonb := '{}'::jsonb;
  v_recipient_merged boolean := false;
  v_recipient_max_slots bigint;
  v_recipient_used_slots bigint;
  v_is_gear boolean;
  v_is_stackable boolean;
begin
  if v_sender_id is null then
    raise exception 'You must be signed in to send items.';
  end if;

  if char_length(v_recipient_name) < 3 then
    raise exception 'Enter a valid player nickname.';
  end if;

  if jsonb_typeof(v_item) <> 'object' then
    raise exception 'Invalid item payload.';
  end if;

  v_item_key := public.inventory_item_stack_key(v_item);
  if v_item_key = '' then
    raise exception 'Invalid item selection.';
  end if;

  select hn.user_id
  into v_recipient_id
  from public.hero_names hn
  where hn.normalized_name = lower(v_recipient_name)
  limit 1;

  if v_recipient_id is null then
    raise exception 'Player not found.';
  end if;

  if v_recipient_id = v_sender_id then
    raise exception 'You cannot send an item to yourself.';
  end if;

  select *
  into v_sender_save_row
  from public.player_saves
  where user_id = v_sender_id
  for update;

  if not found then
    raise exception 'Your cloud save was not found.';
  end if;

  select *
  into v_recipient_save_row
  from public.player_saves
  where user_id = v_recipient_id
  for update;

  if not found then
    raise exception 'Recipient save was not found.';
  end if;

  v_sender_save := coalesce(v_sender_save_row.save_data, '{}'::jsonb);
  v_recipient_save := coalesce(v_recipient_save_row.save_data, '{}'::jsonb);
  v_sender_inventory := case
    when jsonb_typeof(coalesce(v_sender_save -> 'inventory', '[]'::jsonb)) = 'array' then coalesce(v_sender_save -> 'inventory', '[]'::jsonb)
    else '[]'::jsonb
  end;
  v_recipient_inventory := case
    when jsonb_typeof(coalesce(v_recipient_save -> 'inventory', '[]'::jsonb)) = 'array' then coalesce(v_recipient_save -> 'inventory', '[]'::jsonb)
    else '[]'::jsonb
  end;

  v_is_gear := coalesce(v_item ->> 'type', '') = 'gear' or coalesce(v_item ->> 'slot', '') <> '';
  v_is_stackable := coalesce(v_item ->> 'type', '') in ('ore', 'material', 'consumable', 'food', 'fish', 'meat');

  for v_sender_entry in
    select value
    from jsonb_array_elements(v_sender_inventory)
  loop
    if not v_found and public.inventory_item_stack_key(v_sender_entry) = v_item_key then
      v_sender_entry_qty := greatest(1, coalesce(nullif(v_sender_entry ->> 'quantity', '')::integer, nullif(v_sender_entry ->> 'qty', '')::integer, 1));
      if v_sender_entry_qty < v_qty then
        raise exception 'You do not have that many items to send.';
      end if;

      if v_sender_entry_qty > v_qty then
        v_new_sender_inventory := v_new_sender_inventory || jsonb_build_array(
          jsonb_set(v_sender_entry, '{quantity}', to_jsonb(v_sender_entry_qty - v_qty), true)
        );
      end if;

      v_transfer_item := jsonb_set(v_sender_entry, '{quantity}', to_jsonb(v_qty), true);
      v_found := true;
    else
      v_new_sender_inventory := v_new_sender_inventory || jsonb_build_array(v_sender_entry);
    end if;
  end loop;

  if not v_found then
    raise exception 'Selected item is no longer in your inventory.';
  end if;

  v_recipient_max_slots := greatest(0, coalesce(nullif(v_recipient_save ->> 'inventoryMaxSlots', '')::bigint, 1000));
  v_recipient_used_slots := public.inventory_used_units(v_recipient_inventory);
  if v_recipient_used_slots + v_qty > v_recipient_max_slots then
    raise exception 'That player does not have enough inventory space.';
  end if;

  if v_is_gear or not v_is_stackable then
    v_new_recipient_inventory := v_recipient_inventory;
    for i in 1..v_qty loop
      v_new_recipient_inventory := v_new_recipient_inventory || jsonb_build_array(
        jsonb_set(v_transfer_item, '{quantity}', '1'::jsonb, true)
      );
    end loop;
  else
    for v_recipient_entry in
      select value
      from jsonb_array_elements(v_recipient_inventory)
    loop
      if not v_recipient_merged and public.inventory_item_stack_key(v_recipient_entry) = v_item_key then
        v_recipient_entry_qty := greatest(1, coalesce(nullif(v_recipient_entry ->> 'quantity', '')::integer, nullif(v_recipient_entry ->> 'qty', '')::integer, 1));
        v_new_recipient_inventory := v_new_recipient_inventory || jsonb_build_array(
          jsonb_set(v_recipient_entry, '{quantity}', to_jsonb(v_recipient_entry_qty + v_qty), true)
        );
        v_recipient_merged := true;
      else
        v_new_recipient_inventory := v_new_recipient_inventory || jsonb_build_array(v_recipient_entry);
      end if;
    end loop;

    if not v_recipient_merged then
      v_new_recipient_inventory := v_new_recipient_inventory || jsonb_build_array(
        jsonb_set(v_transfer_item, '{quantity}', to_jsonb(v_qty), true)
      );
    end if;
  end if;

  v_sender_save := jsonb_set(v_sender_save, '{inventory}', v_new_sender_inventory, true);
  v_recipient_save := jsonb_set(v_recipient_save, '{inventory}', v_new_recipient_inventory, true);

  update public.player_saves
  set save_data = v_sender_save,
      revision = revision + 1,
      last_synced_at = timezone('utc', now())
  where user_id = v_sender_id;

  update public.player_saves
  set save_data = v_recipient_save,
      revision = revision + 1,
      last_synced_at = timezone('utc', now())
  where user_id = v_recipient_id;

  return jsonb_build_object(
    'ok', true,
    'recipientId', v_recipient_id,
    'recipientName', v_recipient_name,
    'senderSave', v_sender_save,
    'senderRevision', v_sender_save_row.revision + 1,
    'sentItem', v_transfer_item
  );
end;
$$;

grant execute on function public.send_inventory_item(text, jsonb, integer) to authenticated;
