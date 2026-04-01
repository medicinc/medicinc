-- Multiplayer extras: rescue stations, moderation reports, leaderboard RPC

create table if not exists public.rescue_stations (
  id text primary key,
  name text not null,
  city text not null,
  district text not null,
  vehicles jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_rescue_stations_created_by on public.rescue_stations (created_by);
create index if not exists idx_rescue_stations_created_at on public.rescue_stations (created_at desc);

create table if not exists public.moderation_reports (
  id text primary key,
  target_type text not null,
  target_id text,
  target_label text,
  reason text not null,
  reporter_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_reports_created_at on public.moderation_reports (created_at desc);
create index if not exists idx_moderation_reports_reporter on public.moderation_reports (reporter_id);

alter table public.rescue_stations enable row level security;
alter table public.moderation_reports enable row level security;

drop policy if exists "rescue_stations_select_all_auth" on public.rescue_stations;
create policy "rescue_stations_select_all_auth"
  on public.rescue_stations for select
  to authenticated
  using (true);

drop policy if exists "rescue_stations_insert_auth" on public.rescue_stations;
create policy "rescue_stations_insert_auth"
  on public.rescue_stations for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "rescue_stations_update_owner" on public.rescue_stations;
create policy "rescue_stations_update_owner"
  on public.rescue_stations for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "moderation_reports_insert_auth" on public.moderation_reports;
create policy "moderation_reports_insert_auth"
  on public.moderation_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "moderation_reports_select_own" on public.moderation_reports;
create policy "moderation_reports_select_own"
  on public.moderation_reports for select
  to authenticated
  using (reporter_id = auth.uid());

create or replace function public.list_leaderboard(_limit int default 50)
returns table (
  user_id uuid,
  name text,
  title text,
  hospital_name text,
  xp int,
  cases_completed int,
  success_rate int,
  reputation int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    coalesce(p.game_data->>'name', 'Spieler') as name,
    coalesce(p.game_data->>'title', 'Assistenzarzt/-ärztin') as title,
    coalesce(p.game_data->>'hospitalName', '—') as hospital_name,
    coalesce((p.game_data->>'xp')::int, 0) as xp,
    coalesce((p.game_data->'stats'->>'casesCompleted')::int, 0) as cases_completed,
    coalesce((p.game_data->'stats'->>'successRate')::int, 0) as success_rate,
    coalesce((p.game_data->'stats'->>'reputation')::int, 0) as reputation
  from public.profiles p
  where p.game_data is not null
  order by coalesce((p.game_data->>'xp')::int, 0) desc, p.updated_at desc
  limit greatest(1, least(coalesce(_limit, 50), 200));
$$;

grant execute on function public.list_leaderboard(int) to authenticated, anon;

alter table public.rescue_stations replica identity full;
-- Optional if not already enabled in Dashboard -> Database -> Publications
-- alter publication supabase_realtime add table public.rescue_stations;
