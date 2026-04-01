-- Block 2: profiles, hospitals, members, patients, chat, optional events/notifications
-- Run via Supabase CLI or SQL editor after review.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles (game state in game_data jsonb)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text unique,
  game_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_username on public.profiles (username);

-- ---------------------------------------------------------------------------
-- hospitals
-- ---------------------------------------------------------------------------
create table if not exists public.hospitals (
  id text primary key,
  name text not null,
  owner_id uuid references auth.users (id) on delete set null,
  balance numeric not null default 0,
  is_public boolean not null default true,
  city text,
  specialty text,
  hospital_state jsonb not null default '{}'::jsonb,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hospitals_owner on public.hospitals (owner_id);
create index if not exists idx_hospitals_public on public.hospitals (is_public, updated_at desc);

-- ---------------------------------------------------------------------------
-- hospital_members
-- ---------------------------------------------------------------------------
create table if not exists public.hospital_members (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references public.hospitals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  display_rank text,
  permissions jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  unique (hospital_id, user_id)
);

create index if not exists idx_hospital_members_user on public.hospital_members (user_id);
create index if not exists idx_hospital_members_hospital on public.hospital_members (hospital_id);

-- ---------------------------------------------------------------------------
-- patients (normalized; optional granular realtime — full sim still in hospital_state)
-- ---------------------------------------------------------------------------
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references public.hospitals (id) on delete cascade,
  patient_key text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (hospital_id, patient_key)
);

create index if not exists idx_patients_hospital on public.patients (hospital_id);

-- ---------------------------------------------------------------------------
-- hospital_chat_messages
-- ---------------------------------------------------------------------------
create table if not exists public.hospital_chat_messages (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references public.hospitals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_hospital_chat_hospital_created on public.hospital_chat_messages (hospital_id, created_at desc);

-- ---------------------------------------------------------------------------
-- optional: events & notifications
-- ---------------------------------------------------------------------------
create table if not exists public.hospital_events (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references public.hospitals (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_hospital_events_hospital on public.hospital_events (hospital_id, created_at desc);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user on public.user_notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Auth: auto-create profile
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
begin
  base_name := lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-z0-9_]', '', 'g'));
  if base_name is null or length(base_name) < 1 then
    base_name := 'user';
  end if;
  insert into public.profiles (id, email, username, game_data)
  values (
    new.id,
    new.email,
    base_name || '_' || substr(replace(new.id::text, '-', ''), 1, 10),
    '{}'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPC: public hospital directory (no full hospital_state leak)
-- ---------------------------------------------------------------------------
create or replace function public.list_public_hospitals()
returns table (
  id text,
  name text,
  city text,
  specialty text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select h.id, h.name, h.city, h.specialty, h.updated_at
  from public.hospitals h
  where h.is_public = true
  order by h.updated_at desc
  limit 200;
$$;

grant execute on function public.list_public_hospitals() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helper: membership (owner or hospital_members row)
-- ---------------------------------------------------------------------------
create or replace function public.is_hospital_member(_hospital_id text, _uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hospitals h
    where h.id = _hospital_id and h.owner_id = _uid
  )
  or exists (
    select 1 from public.hospital_members m
    where m.hospital_id = _hospital_id and m.user_id = _uid
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.hospitals enable row level security;
alter table public.hospital_members enable row level security;
alter table public.patients enable row level security;
alter table public.hospital_chat_messages enable row level security;
alter table public.hospital_events enable row level security;
alter table public.user_notifications enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- hospitals: members see full row (needed for multiplayer state)
drop policy if exists "hospitals_select_member" on public.hospitals;
create policy "hospitals_select_member"
  on public.hospitals for select
  to authenticated
  using (public.is_hospital_member(id, auth.uid()));

drop policy if exists "hospitals_insert_owner" on public.hospitals;
create policy "hospitals_insert_owner"
  on public.hospitals for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "hospitals_update_member" on public.hospitals;
create policy "hospitals_update_member"
  on public.hospitals for update
  to authenticated
  using (public.is_hospital_member(id, auth.uid()))
  with check (public.is_hospital_member(id, auth.uid()));

-- hospital_members
drop policy if exists "hospital_members_select" on public.hospital_members;
create policy "hospital_members_select"
  on public.hospital_members for select
  to authenticated
  using (public.is_hospital_member(hospital_id, auth.uid()));

drop policy if exists "hospital_members_insert_join" on public.hospital_members;
create policy "hospital_members_insert_join"
  on public.hospital_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.hospitals h
      where h.id = hospital_id
        and (h.is_public = true or h.owner_id = auth.uid())
    )
  );

drop policy if exists "hospital_members_delete_self_or_owner" on public.hospital_members;
create policy "hospital_members_delete_self_or_owner"
  on public.hospital_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.hospitals h
      where h.id = hospital_id and h.owner_id = auth.uid()
    )
  );

drop policy if exists "hospital_members_update_owner" on public.hospital_members;
create policy "hospital_members_update_owner"
  on public.hospital_members for update
  to authenticated
  using (
    exists (
      select 1 from public.hospitals h
      where h.id = hospital_id and h.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.hospitals h
      where h.id = hospital_id and h.owner_id = auth.uid()
    )
  );

-- patients
drop policy if exists "patients_rw_member" on public.patients;
create policy "patients_rw_member"
  on public.patients for all
  to authenticated
  using (public.is_hospital_member(hospital_id, auth.uid()))
  with check (public.is_hospital_member(hospital_id, auth.uid()));

-- chat
drop policy if exists "hospital_chat_select" on public.hospital_chat_messages;
create policy "hospital_chat_select"
  on public.hospital_chat_messages for select
  to authenticated
  using (public.is_hospital_member(hospital_id, auth.uid()));

drop policy if exists "hospital_chat_insert" on public.hospital_chat_messages;
create policy "hospital_chat_insert"
  on public.hospital_chat_messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_hospital_member(hospital_id, auth.uid())
  );

-- events
drop policy if exists "hospital_events_member" on public.hospital_events;
create policy "hospital_events_member"
  on public.hospital_events for all
  to authenticated
  using (public.is_hospital_member(hospital_id, auth.uid()))
  with check (public.is_hospital_member(hospital_id, auth.uid()));

-- notifications
drop policy if exists "user_notifications_own" on public.user_notifications;
create policy "user_notifications_own"
  on public.user_notifications for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Realtime: replica identity for broadcast payloads (enable tables in
-- Supabase Dashboard → Database → Replication if ALTER PUBLICATION is not used)
-- ---------------------------------------------------------------------------
alter table public.hospitals replica identity full;
alter table public.hospital_chat_messages replica identity full;
alter table public.patients replica identity full;

-- Optional (may fail if already added): run once or enable replication in Dashboard
-- alter publication supabase_realtime add table public.hospitals;
-- alter publication supabase_realtime add table public.hospital_chat_messages;
-- alter publication supabase_realtime add table public.patients;

-- ---------------------------------------------------------------------------
-- Seed: public city clinic row (full sim state still merged client-side)
-- ---------------------------------------------------------------------------
insert into public.hospitals (id, name, owner_id, balance, is_public, city, specialty, hospital_state, version)
values (
  'h_city_clinic_berlin',
  'Zentralklinik Berlin-Mitte',
  null,
  0,
  true,
  'Berlin',
  'general',
  '{}'::jsonb,
  1
)
on conflict (id) do nothing;
