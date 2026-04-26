alter table public.chat_messages
add column if not exists party_id uuid references public.parties (id) on delete cascade;

alter table public.chat_messages
drop constraint if exists chat_messages_channel_kind_check;

alter table public.chat_messages
add constraint chat_messages_channel_kind_check
check (channel_kind in ('global', 'market', 'clan', 'party', 'system'));

alter table public.chat_messages
drop constraint if exists clan_chat_requires_clan;

alter table public.chat_messages
drop constraint if exists chat_messages_scope_requires_matching_id;

alter table public.chat_messages
add constraint chat_messages_scope_requires_matching_id
check (
  (channel_kind = 'clan' and clan_id is not null and party_id is null)
  or (channel_kind = 'party' and party_id is not null and clan_id is null)
  or (channel_kind in ('global', 'market', 'system') and clan_id is null and party_id is null)
);

create index if not exists idx_chat_messages_party_time
on public.chat_messages (party_id, created_at desc)
where party_id is not null;

drop policy if exists "chat_messages_select_authenticated" on public.chat_messages;
create policy "chat_messages_select_authenticated"
on public.chat_messages
for select
to authenticated
using (
  channel_kind in ('global', 'market', 'system')
  or (
    channel_kind = 'clan'
    and exists (
      select 1
      from public.clan_members cm
      where cm.clan_id = chat_messages.clan_id
        and cm.user_id = auth.uid()
    )
  )
  or (
    channel_kind = 'party'
    and party_id is not null
    and public.is_party_member(party_id, auth.uid())
  )
);

drop policy if exists "chat_messages_insert_authenticated" on public.chat_messages;
create policy "chat_messages_insert_authenticated"
on public.chat_messages
for insert
to authenticated
with check (
  auth.uid() = user_id
  and author_name <> ''
  and (
    channel_kind in ('global', 'market', 'system')
    or (
      channel_kind = 'clan'
      and exists (
        select 1
        from public.clan_members cm
        where cm.clan_id = chat_messages.clan_id
          and cm.user_id = auth.uid()
      )
    )
    or (
      channel_kind = 'party'
      and party_id is not null
      and public.is_party_member(party_id, auth.uid())
    )
  )
);
