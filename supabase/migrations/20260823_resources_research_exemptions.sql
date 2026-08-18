create table if not exists public.exemption_rule_snapshots (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  source_url text not null,
  source_page_date timestamptz,
  source_hash text not null,
  grade_source_url text not null,
  grade_source_date timestamptz,
  grade_source_hash text not null,
  rule_signature text not null,
  status text not null check (status in ('verified', 'changed', 'unavailable')),
  rules jsonb not null,
  verified_at timestamptz not null,
  next_verification_at timestamptz not null,
  verification_error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_exemption_snapshots_verified
on public.exemption_rule_snapshots (verified_at desc);

alter table public.exemption_rule_snapshots enable row level security;

drop policy if exists "Authenticated users can view exemption snapshots" on public.exemption_rule_snapshots;
create policy "Authenticated users can view exemption snapshots"
on public.exemption_rule_snapshots for select
using (auth.uid() is not null);

create table if not exists public.user_unit_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_code text not null,
  mark numeric check (mark between 0 and 100),
  is_hypothetical boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, unit_code)
);

create index if not exists idx_user_unit_results_user
on public.user_unit_results (user_id, unit_code);

alter table public.user_unit_results enable row level security;

drop policy if exists "Unit results are viewable by owner" on public.user_unit_results;
create policy "Unit results are viewable by owner"
on public.user_unit_results for select
using (auth.uid() = user_id);

drop policy if exists "Unit results can be modified by owner" on public.user_unit_results;
create policy "Unit results can be modified by owner"
on public.user_unit_results for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create trigger set_user_unit_results_updated_at
before update on public.user_unit_results
for each row execute procedure public.update_updated_at_column();

create table if not exists public.resource_research_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canonical_topic text not null,
  display_topic text not null,
  input_fingerprint text not null,
  unit_codes text[] not null default '{}',
  research jsonb not null,
  status text not null default 'ready' check (status in ('ready', 'failed')),
  researched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (user_id, canonical_topic)
);

create index if not exists idx_resource_research_expiry
on public.resource_research_cache (expires_at, canonical_topic);

alter table public.resource_research_cache enable row level security;

drop policy if exists "Research cache is viewable by owner" on public.resource_research_cache;
create policy "Research cache is viewable by owner"
on public.resource_research_cache for select
using (auth.uid() = user_id);

drop policy if exists "Research cache can be modified by owner" on public.resource_research_cache;
create policy "Research cache can be modified by owner"
on public.resource_research_cache for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create trigger set_resource_research_cache_updated_at
before update on public.resource_research_cache
for each row execute procedure public.update_updated_at_column();