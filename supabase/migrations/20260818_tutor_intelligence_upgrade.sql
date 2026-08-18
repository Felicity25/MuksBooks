-- AI Tutor intelligence upgrade: structured learning profile, conversation metadata,
-- encrypted BYOK credentials, and usage telemetry.

create extension if not exists "pgcrypto";

alter table public.tutor_conversations
  add column if not exists active_unit_code text,
  add column if not exists mode text,
  add column if not exists source_scope jsonb not null default '{}'::jsonb,
  add column if not exists summary text;

alter table public.tutor_messages
  add column if not exists citations jsonb not null default '[]'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.tutor_learning_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_depth text not null default 'balanced',
  hint_style text not null default 'progressive',
  confidence_r numeric not null default 0.5,
  recent_topics jsonb not null default '[]'::jsonb,
  repeated_misconceptions jsonb not null default '[]'::jsonb,
  successful_approaches jsonb not null default '[]'::jsonb,
  struggling_approaches jsonb not null default '[]'::jsonb,
  practice_signals jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tutor_provider_credentials (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic')),
  label text not null default 'default',
  encrypted_api_key text not null,
  encryption_iv text not null,
  encryption_tag text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, label)
);

create table if not exists public.tutor_usage_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id text,
  provider text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  cost_microusd bigint,
  route text,
  created_at timestamptz not null default now()
);

alter table public.tutor_learning_profiles enable row level security;
alter table public.tutor_provider_credentials enable row level security;
alter table public.tutor_usage_events enable row level security;

drop policy if exists "Tutor learning profiles owner all" on public.tutor_learning_profiles;
create policy "Tutor learning profiles owner all"
on public.tutor_learning_profiles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Tutor provider credentials owner all" on public.tutor_provider_credentials;
create policy "Tutor provider credentials owner all"
on public.tutor_provider_credentials for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Tutor usage events owner select" on public.tutor_usage_events;
create policy "Tutor usage events owner select"
on public.tutor_usage_events for select
using (auth.uid() = user_id);

drop policy if exists "Tutor usage events owner insert" on public.tutor_usage_events;
create policy "Tutor usage events owner insert"
on public.tutor_usage_events for insert
with check (auth.uid() = user_id);

create index if not exists idx_tutor_conv_user_unit on public.tutor_conversations (user_id, active_unit_code);
create index if not exists idx_tutor_messages_conv_created on public.tutor_messages (conversation_id, created_at);
create index if not exists idx_tutor_usage_user_created on public.tutor_usage_events (user_id, created_at desc);

create trigger set_tutor_learning_profiles_updated_at
before update on public.tutor_learning_profiles
for each row execute procedure public.update_updated_at_column();

create trigger set_tutor_provider_credentials_updated_at
before update on public.tutor_provider_credentials
for each row execute procedure public.update_updated_at_column();
