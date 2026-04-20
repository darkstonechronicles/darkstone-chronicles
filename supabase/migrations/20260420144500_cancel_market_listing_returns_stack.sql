create or replace function public.market_add_inventory_stack_item(
  p_inventory jsonb,
  p_item jsonb,
  p_quantity integer
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_inventory jsonb := case
    when jsonb_typeof(coalesce(p_inventory, '[]'::jsonb)) = 'array' then coalesce(p_inventory, '[]'::jsonb)
    else '[]'::jsonb
  end;
  v_new_inventory jsonb := '[]'::jsonb;
  v_item jsonb := coalesce(p_item, '{}'::jsonb);
  v_qty integer := greatest(1, coalesce(p_quantity, 1));
  v_item_key text := public.inventory_item_stack_key(p_item);
  v_entry jsonb;
  v_entry_qty integer;
  v_merged boolean := false;
begin
  for v_entry in select value from jsonb_array_elements(v_inventory)
  loop
    if not v_merged and public.inventory_item_stack_key(v_entry) = v_item_key then
      v_entry_qty := greatest(1, coalesce(nullif(v_entry ->> 'quantity', '')::integer, nullif(v_entry ->> 'qty', '')::integer, 1));
      v_new_inventory := v_new_inventory || jsonb_build_array(
        jsonb_set(v_entry, '{quantity}', to_jsonb(v_entry_qty + v_qty), true)
      );
      v_merged := true;
    else
      v_new_inventory := v_new_inventory || jsonb_build_array(v_entry);
    end if;
  end loop;

  if not v_merged then
    v_new_inventory := v_new_inventory || jsonb_build_array(
      jsonb_set(v_item, '{quantity}', to_jsonb(v_qty), true)
    );
  end if;

  return v_new_inventory;
end;
$$;

create or replace function public.cancel_market_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_listing public.market_listings%rowtype;
  v_save_row public.player_saves%rowtype;
  v_save jsonb;
  v_inventory jsonb;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to cancel listings.';
  end if;

  select *
  into v_listing
  from public.market_listings
  where id = p_listing_id
  for update;

  if not found or v_listing.status <> 'active' then
    raise exception 'Listing is no longer active.';
  end if;

  if v_listing.seller_user_id <> v_user_id then
    raise exception 'This is not your listing.';
  end if;

  select *
  into v_save_row
  from public.player_saves
  where user_id = v_user_id
  for update;

  if not found then
    raise exception 'Your cloud save was not found.';
  end if;

  v_save := coalesce(v_save_row.save_data, '{}'::jsonb);
  v_inventory := case
    when jsonb_typeof(coalesce(v_save -> 'inventory', '[]'::jsonb)) = 'array' then coalesce(v_save -> 'inventory', '[]'::jsonb)
    else '[]'::jsonb
  end;

  if public.inventory_used_units(v_inventory) + v_listing.quantity > greatest(0, coalesce(nullif(v_save ->> 'inventoryMaxSlots', '')::bigint, 1000)) then
    raise exception 'Not enough inventory space to cancel this listing.';
  end if;

  v_save := jsonb_set(
    v_save,
    '{inventory}',
    public.market_add_inventory_stack_item(v_inventory, v_listing.item, v_listing.quantity),
    true
  );

  update public.player_saves
  set save_data = v_save,
      revision = revision + 1,
      last_synced_at = timezone('utc', now())
  where user_id = v_user_id;

  update public.market_listings
  set status = 'cancelled'
  where id = v_listing.id;

  return jsonb_build_object(
    'ok', true,
    'sellerSave', v_save,
    'sellerRevision', v_save_row.revision + 1
  );
end;
$$;

grant execute on function public.market_add_inventory_stack_item(jsonb, jsonb, integer) to authenticated;
grant execute on function public.cancel_market_listing(uuid) to authenticated;
