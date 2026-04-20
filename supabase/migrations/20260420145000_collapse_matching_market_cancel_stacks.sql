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
  v_total_qty integer := greatest(1, coalesce(p_quantity, 1));
  v_entry jsonb;
  v_entry_qty integer;
  v_inserted boolean := false;
begin
  for v_entry in select value from jsonb_array_elements(v_inventory)
  loop
    if public.inventory_item_stack_key(v_entry) = v_item_key then
      v_entry_qty := greatest(1, coalesce(nullif(v_entry ->> 'quantity', '')::integer, nullif(v_entry ->> 'qty', '')::integer, 1));
      v_total_qty := v_total_qty + v_entry_qty;

      if not v_inserted then
        v_new_inventory := v_new_inventory || jsonb_build_array(
          jsonb_set(v_entry, '{quantity}', to_jsonb(v_total_qty), true)
        );
        v_inserted := true;
      else
        v_new_inventory := jsonb_set(
          v_new_inventory,
          array[(jsonb_array_length(v_new_inventory) - 1)::text, 'quantity'],
          to_jsonb(v_total_qty),
          true
        );
      end if;
    else
      v_new_inventory := v_new_inventory || jsonb_build_array(v_entry);
    end if;
  end loop;

  if not v_inserted then
    v_new_inventory := v_new_inventory || jsonb_build_array(
      jsonb_set(v_item, '{quantity}', to_jsonb(v_qty), true)
    );
  end if;

  return v_new_inventory;
end;
$$;

grant execute on function public.market_add_inventory_stack_item(jsonb, jsonb, integer) to authenticated;
