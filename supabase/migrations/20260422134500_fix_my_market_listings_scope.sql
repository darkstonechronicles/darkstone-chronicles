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
