# Supabase Workspace

This folder keeps the backend for `Darkstone Chronicles` in the same repo as the game client.

## What lives here

- `config.toml`: local Supabase CLI config
- `migrations/`: database schema and RLS changes
- `functions/`: Edge Functions that hold sensitive server-side logic
- `seed.sql`: optional local-only seed data

## First-time setup

1. `supabase login`
2. `supabase link --project-ref ibpwrvtsnuhbylexuoil`
3. `supabase db push`
4. `supabase functions deploy bootstrap-player`
5. `supabase functions deploy save-backup`
6. `supabase functions deploy action-journal`

## Local workflow

1. `supabase start`
2. `supabase db reset`
3. `supabase functions serve bootstrap-player --no-verify-jwt`

## Current backend scope

- `profiles`: player identity/profile row per auth user
- `player_saves`: cloud save payload per player
- `player_save_backups`: versioned recovery snapshots for synced saves
- `player_action_journal`: append-only action receipts for server-side recovery/dedupe
- `player_public_stats`: public-facing summary for leaderboards
- `admin_users`: allowlist of accounts that may use admin-only server tools
- `clans` + `clan_members`: first social data model
- `chat_messages`: shared/global/clan chat stream
- `bootstrap-player` Edge Function: secure profile/save bootstrap and sync entrypoint
- `save-backup` Edge Function: authenticated self-backup endpoint for throttled recovery snapshots
- `action-journal` Edge Function: authenticated action receipt journal with per-user dedupe
- `admin-grant` Edge Function: admin-only self-grants for safe testing

## Important note

Do not commit any service-role keys, database passwords, or provider secrets into this repo.

## Admin grants

Use SQL to allow a user to self-grant testing resources:

```sql
insert into public.admin_users (user_id, note)
values ('PUT-USER-ID-HERE', 'local admin')
on conflict (user_id) do update
set note = excluded.note;
```

Deploy the new backend pieces:

1. `supabase db push`
2. `supabase functions deploy admin-grant`

The function only works for users present in `public.admin_users`, and only modifies the caller's own save.
