-- Einmalig in Supabase SQL-Editor ausführen
-- (Dashboard → SQL Editor → New query → Paste → Run)

create table if not exists user_sync (
  user_id   text primary key,
  payload   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Zugriff für anonyme Schlüssel erlauben (kein Login nötig)
alter table user_sync enable row level security;
create policy "allow_all" on user_sync for all using (true) with check (true);
