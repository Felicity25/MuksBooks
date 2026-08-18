-- Extend units with edit/archive fields needed by the Units + Semester Timeline upgrade
alter table public.units add column if not exists year integer;
alter table public.units add column if not exists color text;
alter table public.units add column if not exists icon text;
alter table public.units add column if not exists mastery_level numeric not null default 0;

-- Canonical, persistent weekly schedule for a unit (one source of truth for topics)
create table if not exists public.unit_schedule_entries (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  unit_id               uuid not null references public.units(id) on delete cascade,
  week_number           integer not null,
  start_date            date,
  end_date              date,
  topic                 text not null,
  additional_topics     jsonb not null default '[]',
  notes                 text,
  source_upload_id      uuid references public.uploads(id) on delete set null,
  extraction_confidence numeric,
  is_break              boolean not null default false,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_unit_schedule_entries_unit on public.unit_schedule_entries (unit_id);
create index if not exists idx_unit_schedule_entries_user on public.unit_schedule_entries (user_id);

alter table public.unit_schedule_entries enable row level security;

create policy "Schedule entries are viewable by owner"
  on public.unit_schedule_entries for select using (auth.uid() = user_id);
create policy "Schedule entries can be modified by owner"
  on public.unit_schedule_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger set_unit_schedule_entries_updated_at
before update on public.unit_schedule_entries
for each row execute procedure public.update_updated_at_column();
