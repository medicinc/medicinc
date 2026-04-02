-- User feedback / bug reports with optional screenshot storage

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_email text,
  category text not null check (category in ('bug', 'feedback', 'idea', 'other')),
  title text not null,
  body text not null,
  attachment_paths jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_feedback_created_at on public.user_feedback (created_at desc);
create index if not exists idx_user_feedback_user_id on public.user_feedback (user_id);

alter table public.user_feedback enable row level security;

drop policy if exists "user_feedback_insert_own" on public.user_feedback;
create policy "user_feedback_insert_own"
  on public.user_feedback for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_feedback_select_own" on public.user_feedback;
create policy "user_feedback_select_own"
  on public.user_feedback for select
  to authenticated
  using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback-attachments',
  'feedback-attachments',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "feedback_attachments_insert_own" on storage.objects;
create policy "feedback_attachments_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'feedback-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "feedback_attachments_select_own" on storage.objects;
create policy "feedback_attachments_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'feedback-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
