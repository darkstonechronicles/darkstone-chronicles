alter table public.parties
add column if not exists selected_monster_id text not null default '';
