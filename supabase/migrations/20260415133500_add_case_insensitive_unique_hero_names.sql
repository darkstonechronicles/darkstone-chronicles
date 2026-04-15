create table if not exists public.hero_names (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  hero_name text not null check (char_length(btrim(hero_name)) between 3 and 20),
  normalized_name text generated always as (lower(btrim(hero_name))) stored,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_hero_names_updated_at on public.hero_names;
create trigger set_hero_names_updated_at
before update on public.hero_names
for each row execute function public.set_updated_at();

with ranked_names as (
  select
    p.id as user_id,
    btrim(coalesce(nullif(ps.hero_name, ''), nullif(p.display_name, ''))) as hero_name,
    row_number() over (
      partition by lower(btrim(coalesce(nullif(ps.hero_name, ''), nullif(p.display_name, ''))))
      order by p.created_at asc, p.id asc
    ) as rn
  from public.profiles p
  left join public.player_public_stats ps
    on ps.user_id = p.id
)
insert into public.hero_names (user_id, hero_name)
select user_id, hero_name
from ranked_names
where rn = 1
  and char_length(hero_name) between 3 and 20
  and lower(hero_name) <> 'hero'
on conflict (user_id) do nothing;

create unique index if not exists idx_hero_names_normalized_name
on public.hero_names (normalized_name);

alter table public.hero_names enable row level security;

