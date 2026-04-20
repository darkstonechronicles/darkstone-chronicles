create table if not exists public.market_sales (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.market_listings (id) on delete set null,
  seller_user_id uuid not null references public.profiles (id) on delete cascade,
  buyer_user_id uuid references public.profiles (id) on delete set null,
  item jsonb not null,
  item_name text not null,
  item_img text,
  category text not null,
  gear_slot text,
  quantity integer not null check (quantity > 0),
  price_each bigint not null check (price_each > 0),
  total_gold bigint not null check (total_gold > 0),
  sold_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_market_sales_seller_sold_at
on public.market_sales (seller_user_id, sold_at desc);

alter table public.market_sales enable row level security;

drop policy if exists "market_sales_select_own" on public.market_sales;
create policy "market_sales_select_own"
on public.market_sales
for select
to authenticated
using (seller_user_id = auth.uid() or buyer_user_id = auth.uid());

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

  insert into public.market_sales (
    listing_id,
    seller_user_id,
    buyer_user_id,
    item,
    item_name,
    item_img,
    category,
    gear_slot,
    quantity,
    price_each,
    total_gold
  ) values (
    v_listing.id,
    v_listing.seller_user_id,
    v_buyer_id,
    v_buy_item,
    v_listing.item_name,
    v_listing.item_img,
    v_listing.category,
    v_listing.gear_slot,
    v_qty,
    v_listing.price_each,
    v_total
  );

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

create or replace function public.get_my_market_sales(p_limit integer default 20)
returns table (
  id uuid,
  listing_id uuid,
  item jsonb,
  item_name text,
  item_img text,
  category text,
  gear_slot text,
  quantity integer,
  price_each bigint,
  total_gold bigint,
  sold_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    ms.id,
    ms.listing_id,
    ms.item,
    ms.item_name,
    ms.item_img,
    ms.category,
    ms.gear_slot,
    ms.quantity,
    ms.price_each,
    ms.total_gold,
    ms.sold_at
  from public.market_sales ms
  where ms.seller_user_id = auth.uid()
  order by ms.sold_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

grant execute on function public.buy_market_listing(uuid, integer) to authenticated;
grant execute on function public.get_my_market_sales(integer) to authenticated;
