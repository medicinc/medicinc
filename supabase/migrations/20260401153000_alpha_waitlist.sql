create table if not exists public.alpha_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null unique,
  name text not null,
  role_interest text,
  platform text,
  note text,
  consent_tos boolean not null default false,
  consent_privacy boolean not null default false,
  consent_ai_chat boolean not null default false,
  consent_updates_optional boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed', 'invited')),
  source text not null default 'landing',
  doi_token_hash text,
  doi_sent_at timestamptz,
  confirmed_at timestamptz,
  invite_sent_at timestamptz,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_alpha_waitlist_status on public.alpha_waitlist (status, created_at desc);
create index if not exists idx_alpha_waitlist_email on public.alpha_waitlist (email_normalized);

alter table public.alpha_waitlist enable row level security;

-- No direct client access. Writes/reads happen only via edge functions.
