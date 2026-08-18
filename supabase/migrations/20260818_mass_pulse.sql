create table if not exists public.mass_sources (
  id text primary key,
  name text not null,
  source_url text not null,
  source_type text not null,
  content_hash text,
  last_checked_at timestamptz,
  last_successful_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mass_items (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  canonical_url text not null,
  title text not null,
  organisation text not null default 'Monash Actuarial Students Society',
  category text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  registration_deadline timestamptz,
  location text,
  relevant_areas jsonb not null default '[]'::jsonb,
  is_mass_projects boolean not null default false,
  why_relevant text,
  content_hash text not null,
  dedupe_key text not null,
  source_urls jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mass_sync_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('full', 'delta')),
  started_at timestamptz not null,
  completed_at timestamptz,
  changed_sources integer not null default 0,
  new_items integer not null default 0,
  careers_forwarded integer not null default 0,
  failures jsonb not null default '[]'::jsonb
);

create unique index if not exists idx_mass_items_canonical_url on public.mass_items (canonical_url);
create index if not exists idx_mass_items_dedupe_key on public.mass_items (dedupe_key);
create index if not exists idx_mass_items_starts_at on public.mass_items (starts_at);
create index if not exists idx_mass_items_category on public.mass_items (category);

alter table public.mass_sources enable row level security;
alter table public.mass_items enable row level security;
alter table public.mass_sync_runs enable row level security;

drop policy if exists "MASS items are publicly readable" on public.mass_items;
create policy "MASS items are publicly readable" on public.mass_items for select using (true);

drop trigger if exists set_mass_sources_updated_at on public.mass_sources;
create trigger set_mass_sources_updated_at before update on public.mass_sources for each row execute procedure public.update_updated_at_column();
drop trigger if exists set_mass_items_updated_at on public.mass_items;
create trigger set_mass_items_updated_at before update on public.mass_items for each row execute procedure public.update_updated_at_column();