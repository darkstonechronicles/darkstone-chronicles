create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.profiles (id) on delete cascade,
  seller_name text not null default 'Hero',
  buyer_user_id uuid references public.profiles (id) on delete set null,
  item jsonb not null,
  item_name text not null,
  item_img text,
  item_rarity text,
  category text not null check (category in ('gear', 'materials')),
  gear_slot text,
  quantity integer not null check (quantity > 0),
  price_each bigint not null check (price_each > 0),
  status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  sold_at timestamptz
);

create index if not exists idx_market_listings_active_created
on public.market_listings (status, created_at desc);

create index if not exists idx_market_listings_category_slot
on public.market_listings (status, category, gear_slot, created_at desc);

drop trigger if exists set_market_listings_updated_at on public.market_listings;
create trigger set_market_listings_updated_at
before update on public.market_listings
for each row
execute function public.set_updated_at();

alter table public.market_listings enable row level security;

drop policy if exists "market_listings_select_authenticated" on public.market_listings;
create policy "market_listings_select_authenticated"
on public.market_listings
for select
to authenticated
using (true);

create or replace function public.market_item_category(p_item jsonb)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_item ->> 'type', '') = 'gear' or coalesce(p_item ->> 'slot', '') <> '' then 'gear'
    else 'materials'
  end;
$$;

create or replace function public.market_add_inventory_item(
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
  v_is_gear boolean := coalesce(p_item ->> 'type', '') = 'gear' or coalesce(p_item ->> 'slot', '') <> '';
  v_is_stackable boolean := coalesce(p_item ->> 'type', '') in ('ore', 'material', 'consumable', 'food', 'fish', 'meat');
  v_entry jsonb;
  v_entry_qty integer;
  v_merged boolean := false;
begin
  if v_is_gear or not v_is_stackable then
    v_new_inventory := v_inventory;
    for i in 1..v_qty loop
      v_new_inventory := v_new_inventory || jsonb_build_array(
        jsonb_set(v_item, '{quantity}', '1'::jsonb, true)
      );
    end loop;
    return v_new_inventory;
  end if;

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

create or replace function public.create_market_listing(
  p_item jsonb,
  p_quantity integer,
  p_price_each bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid := auth.uid();
  v_save_row public.player_saves%rowtype;
  v_save jsonb;
  v_inventory jsonb;
  v_new_inventory jsonb := '[]'::jsonb;
  v_item jsonb := coalesce(p_item, '{}'::jsonb);
  v_item_key text;
  v_qty integer := greatest(1, coalesce(p_quantity, 1));
  v_price bigint := greatest(1, coalesce(p_price_each, 1));
  v_entry jsonb;
  v_entry_qty integer;
  v_found boolean := false;
  v_listing_item jsonb := '{}'::jsonb;
  v_category text;
  v_listing public.market_listings%rowtype;
begin
  if v_seller_id is null then
    raise exception 'You must be signed in to list items.';
  end if;

  if jsonb_typeof(v_item) <> 'object' then
    raise exception 'Invalid item payload.';
  end if;

  v_item_key := public.inventory_item_stack_key(v_item);
  if v_item_key = '' then
    raise exception 'Invalid item selection.';
  end if;

  select *
  into v_save_row
  from public.player_saves
  where user_id = v_seller_id
  for update;

  if not found then
    raise exception 'Your cloud save was not found.';
  end if;

  v_save := coalesce(v_save_row.save_data, '{}'::jsonb);
  v_inventory := case
    when jsonb_typeof(coalesce(v_save -> 'inventory', '[]'::jsonb)) = 'array' then coalesce(v_save -> 'inventory', '[]'::jsonb)
    else '[]'::jsonb
  end;

  for v_entry in select value from jsonb_array_elements(v_inventory)
  loop
    if not v_found and public.inventory_item_stack_key(v_entry) = v_item_key then
      v_entry_qty := greatest(1, coalesce(nullif(v_entry ->> 'quantity', '')::integer, nullif(v_entry ->> 'qty', '')::integer, 1));
      if v_entry_qty < v_qty then
        raise exception 'You do not have that many items to list.';
      end if;
      if v_entry_qty > v_qty then
        v_new_inventory := v_new_inventory || jsonb_build_array(
          jsonb_set(v_entry, '{quantity}', to_jsonb(v_entry_qty - v_qty), true)
        );
      end if;
      v_listing_item := jsonb_set(v_entry, '{quantity}', to_jsonb(v_qty), true);
      v_found := true;
    else
      v_new_inventory := v_new_inventory || jsonb_build_array(v_entry);
    end if;
  end loop;

  if not v_found then
    raise exception 'Selected item is no longer in your inventory.';
  end if;

  v_category := public.market_item_category(v_listing_item);

  insert into public.market_listings (
    seller_user_id,
    seller_name,
    item,
    item_name,
    item_img,
    item_rarity,
    category,
    gear_slot,
    quantity,
    price_each
  )
  values (
    v_seller_id,
    coalesce(nullif(v_save ->> 'heroName', ''), nullif(v_save ->> 'playerName', ''), 'Hero'),
    v_listing_item,
    coalesce(nullif(v_listing_item ->> 'name', ''), 'Item'),
    nullif(v_listing_item ->> 'img', ''),
    nullif(v_listing_item ->> 'rarity', ''),
    v_category,
    nullif(v_listing_item ->> 'slot', ''),
    v_qty,
    v_price
  )
  returning * into v_listing;

  v_save := jsonb_set(v_save, '{inventory}', v_new_inventory, true);

  update public.player_saves
  set save_data = v_save,
      revision = revision + 1,
      last_synced_at = timezone('utc', now())
  where user_id = v_seller_id;

  return jsonb_build_object(
    'ok', true,
    'listingId', v_listing.id,
    'sellerSave', v_save,
    'sellerRevision', v_save_row.revision + 1
  );
end;
$$;

create or replace function public.buy_market_listing(
  p_listing_id uuid,
  p_quantity integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid := auth.uid();
  v_listing public.market_listings%rowtype;
  v_buyer_save_row public.player_saves%rowtype;
  v_seller_save_row public.player_saves%rowtype;
  v_buyer_save jsonb;
  v_seller_save jsonb;
  v_buyer_inventory jsonb;
  v_seller_gold bigint;
  v_buyer_gold bigint;
  v_buyer_max_slots bigint;
  v_buyer_used_slots bigint;
  v_qty integer := greatest(1, coalesce(p_quantity, 1));
  v_total bigint;
  v_buy_item jsonb;
begin
  if v_buyer_id is null then
    raise exception 'You must be signed in to buy items.';
  end if;

  select *
  into v_listing
  from public.market_listings
  where id = p_listing_id
  for update;

  if not found or v_listing.status <> 'active' then
    raise exception 'Listing is no longer available.';
  end if;

  if v_listing.seller_user_id = v_buyer_id then
    raise exception 'You cannot buy your own listing.';
  end if;

  if v_listing.quantity < v_qty then
    raise exception 'Not enough quantity left in this listing.';
  end if;

  select *
  into v_buyer_save_row
  from public.player_saves
  where user_id = v_buyer_id
  for update;

  if not found then
    raise exception 'Your cloud save was not found.';
  end if;

  select *
  into v_seller_save_row
  from public.player_saves
  where user_id = v_listing.seller_user_id
  for update;

  if not found then
    raise exception 'Seller save was not found.';
  end if;

  v_total := v_listing.price_each * v_qty;
  v_buyer_save := coalesce(v_buyer_save_row.save_data, '{}'::jsonb);
  v_seller_save := coalesce(v_seller_save_row.save_data, '{}'::jsonb);
  v_buyer_gold := greatest(0, coalesce(nullif(v_buyer_save ->> 'gold', '')::bigint, 0));

  if v_buyer_gold < v_total then
    raise exception 'Not enough gold.';
  end if;

  v_buyer_inventory := case
    when jsonb_typeof(coalesce(v_buyer_save -> 'inventory', '[]'::jsonb)) = 'array' then coalesce(v_buyer_save -> 'inventory', '[]'::jsonb)
    else '[]'::jsonb
  end;
  v_buyer_max_slots := greatest(0, coalesce(nullif(v_buyer_save ->> 'inventoryMaxSlots', '')::bigint, 1000));
  v_buyer_used_slots := public.inventory_used_units(v_buyer_inventory);
  if v_buyer_used_slots + v_qty > v_buyer_max_slots then
    raise exception 'Not enough inventory space.';
  end if;

  v_buy_item := jsonb_set(v_listing.item, '{quantity}', to_jsonb(v_qty), true);
  v_buyer_save := jsonb_set(v_buyer_save, '{gold}', to_jsonb(v_buyer_gold - v_total), true);
  v_buyer_save := jsonb_set(
    v_buyer_save,
    '{inventory}',
    public.market_add_inventory_item(v_buyer_inventory, v_buy_item, v_qty),
    true
  );

  v_seller_gold := greatest(0, coalesce(nullif(v_seller_save ->> 'gold', '')::bigint, 0));
  v_seller_save := jsonb_set(v_seller_save, '{gold}', to_jsonb(v_seller_gold + v_total), true);

  update public.player_saves
  set save_data = v_buyer_save,
      revision = revision + 1,
      last_synced_at = timezone('utc', now())
  where user_id = v_buyer_id;

  update public.player_saves
  set save_data = v_seller_save,
      revision = revision + 1,
      last_synced_at = timezone('utc', now())
  where user_id = v_listing.seller_user_id;

  update public.player_public_stats
  set total_gold = greatest(0, v_buyer_gold - v_total)
  where user_id = v_buyer_id;

  update public.player_public_stats
  set total_gold = greatest(0, v_seller_gold + v_total)
  where user_id = v_listing.seller_user_id;

  update public.market_listings
  set quantity = v_listing.quantity - v_qty,
      buyer_user_id = v_buyer_id,
      status = case when v_listing.quantity - v_qty <= 0 then 'sold' else 'active' end,
      sold_at = case when v_listing.quantity - v_qty <= 0 then timezone('utc', now()) else sold_at end
  where id = v_listing.id;

  return jsonb_build_object(
    'ok', true,
    'buyerSave', v_buyer_save,
    'buyerRevision', v_buyer_save_row.revision + 1,
    'quantity', v_qty,
    'total', v_total
  );
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
    public.market_add_inventory_item(v_inventory, v_listing.item, v_listing.quantity),
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

grant execute on function public.create_market_listing(jsonb, integer, bigint) to authenticated;
grant execute on function public.buy_market_listing(uuid, integer) to authenticated;
grant execute on function public.cancel_market_listing(uuid) to authenticated;
