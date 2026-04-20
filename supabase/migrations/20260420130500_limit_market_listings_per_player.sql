create or replace function public.enforce_market_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_count integer;
begin
  if new.status = 'active' then
    select count(*)
    into v_active_count
    from public.market_listings ml
    where ml.seller_user_id = new.seller_user_id
      and ml.status = 'active'
      and ml.quantity > 0
      and (tg_op = 'INSERT' or ml.id <> new.id);

    if v_active_count >= 10 then
      raise exception 'You can only have 10 active market listings.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_market_listing_limit on public.market_listings;
create trigger enforce_market_listing_limit
before insert or update of seller_user_id, status, quantity
on public.market_listings
for each row
execute function public.enforce_market_listing_limit();

create or replace function public.get_my_market_listings()
returns table (
  id uuid,
  seller_user_id uuid,
  seller_name text,
  item jsonb,
  item_name text,
  item_img text,
  item_rarity text,
  category text,
  gear_slot text,
  quantity integer,
  price_each bigint,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    ml.id,
    ml.seller_user_id,
    ml.seller_name,
    ml.item,
    ml.item_name,
    ml.item_img,
    ml.item_rarity,
    ml.category,
    ml.gear_slot,
    ml.quantity,
    ml.price_each,
    ml.created_at
  from public.market_listings ml
  where ml.seller_user_id = auth.uid()
    and ml.status = 'active'
    and ml.quantity > 0
  order by ml.created_at desc;
$$;

grant execute on function public.get_my_market_listings() to authenticated;
