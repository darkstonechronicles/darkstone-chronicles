alter table public.market_listings
drop constraint if exists market_listings_quantity_check;

alter table public.market_listings
add constraint market_listings_quantity_check
check (
  quantity >= 0
  and (
    status <> 'active'
    or quantity > 0
  )
);
