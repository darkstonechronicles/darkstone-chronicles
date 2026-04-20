alter table public.market_listings replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'market_listings'
    ) then
      alter publication supabase_realtime add table public.market_listings;
    end if;
  end if;
end;
$$;
