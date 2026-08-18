create table if not exists public.resource_research_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  canonical_topic text not null,
  display_topic text not null,
  input_fingerprint text not null,
  unit_codes text[] not null default '{}',
  research jsonb not null,
  status text not null default 'ready' check (status in ('ready', 'failed')),
  researched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.resource_research_cache
add column if not exists user_id uuid references auth.users(id) on delete cascade;

delete from public.resource_research_cache where user_id is null;

alter table public.resource_research_cache
alter column user_id set not null;

alter table public.resource_research_cache
drop constraint if exists resource_research_cache_canonical_topic_key;

create unique index if not exists idx_resource_research_user_topic
on public.resource_research_cache (user_id, canonical_topic);

create index if not exists idx_resource_research_expiry
on public.resource_research_cache (expires_at, canonical_topic);

alter table public.resource_research_cache enable row level security;

drop policy if exists "Authenticated users can view research cache" on public.resource_research_cache;
drop policy if exists "Research cache is viewable by owner" on public.resource_research_cache;
create policy "Research cache is viewable by owner"
on public.resource_research_cache for select
using (auth.uid() = user_id);

drop policy if exists "Research cache can be modified by owner" on public.resource_research_cache;
create policy "Research cache can be modified by owner"
on public.resource_research_cache for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists set_resource_research_cache_updated_at on public.resource_research_cache;
create trigger set_resource_research_cache_updated_at
before update on public.resource_research_cache
for each row execute procedure public.update_updated_at_column();