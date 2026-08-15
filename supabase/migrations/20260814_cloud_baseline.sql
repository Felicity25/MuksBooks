create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  university text,
  degree text,
  timezone text default 'Australia/Melbourne',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  status text not null default 'active',
  semester text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, code)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  title text not null,
  description text,
  task_type text not null default 'study',
  status text not null default 'pending',
  priority numeric not null default 0.5,
  due_date timestamptz,
  planned_date timestamptz,
  estimated_minutes integer not null default 45,
  created_by text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  name text not null,
  assessment_type text not null default 'assignment',
  weighting numeric,
  due_date timestamptz,
  status text not null default 'upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, unit_id, name)
);

create table if not exists public.planner_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  event_type text not null default 'study',
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mastery_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid references public.units(id) on delete cascade,
  topic text not null,
  mastery_score numeric not null default 0,
  confidence_score numeric not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, unit_id, topic)
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  storage_path text not null,
  original_filename text not null,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, storage_path)
);

create table if not exists public.tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.tutor_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme text default 'light',
  name text,
  degree text,
  target_marks text,
  feedback_strictness text default 'normal',
  pomodoro_length integer default 25,
  study_times text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_units_user_id on public.units (user_id);
create index if not exists idx_tasks_user_id on public.tasks (user_id);
create index if not exists idx_tasks_due_date on public.tasks (due_date);
create index if not exists idx_assessments_user_id on public.assessments (user_id);
create index if not exists idx_planner_events_user_id on public.planner_events (user_id);
create index if not exists idx_study_sessions_user_id on public.study_sessions (user_id);
create index if not exists idx_mastery_user_id on public.mastery_records (user_id);
create index if not exists idx_uploads_user_id on public.uploads (user_id);
create index if not exists idx_tutor_conversations_user_id on public.tutor_conversations (user_id);
create index if not exists idx_user_settings_user_id on public.user_settings (user_id);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.update_updated_at_column();

create trigger set_units_updated_at
before update on public.units
for each row execute procedure public.update_updated_at_column();

create trigger set_tasks_updated_at
before update on public.tasks
for each row execute procedure public.update_updated_at_column();

create trigger set_assessments_updated_at
before update on public.assessments
for each row execute procedure public.update_updated_at_column();

create trigger set_planner_events_updated_at
before update on public.planner_events
for each row execute procedure public.update_updated_at_column();

create trigger set_study_sessions_updated_at
before update on public.study_sessions
for each row execute procedure public.update_updated_at_column();

create trigger set_mastery_records_updated_at
before update on public.mastery_records
for each row execute procedure public.update_updated_at_column();

create trigger set_uploads_updated_at
before update on public.uploads
for each row execute procedure public.update_updated_at_column();

create trigger set_tutor_conversations_updated_at
before update on public.tutor_conversations
for each row execute procedure public.update_updated_at_column();

create trigger set_user_settings_updated_at
before update on public.user_settings
for each row execute procedure public.update_updated_at_column();

alter table public.profiles enable row level security;
alter table public.units enable row level security;
alter table public.tasks enable row level security;
alter table public.assessments enable row level security;
alter table public.planner_events enable row level security;
alter table public.study_sessions enable row level security;
alter table public.mastery_records enable row level security;
alter table public.uploads enable row level security;
alter table public.tutor_conversations enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.user_settings enable row level security;

create policy "Profiles are viewable by owner"
on public.profiles for select using (auth.uid() = id);
create policy "Profiles can be updated by owner"
on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Profiles can be inserted by owner"
on public.profiles for insert with check (auth.uid() = id);

create policy "Units are viewable by owner"
on public.units for select using (auth.uid() = user_id);
create policy "Units can be modified by owner"
on public.units for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Tasks are viewable by owner"
on public.tasks for select using (auth.uid() = user_id);
create policy "Tasks can be modified by owner"
on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Assessments are viewable by owner"
on public.assessments for select using (auth.uid() = user_id);
create policy "Assessments can be modified by owner"
on public.assessments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Planner events are viewable by owner"
on public.planner_events for select using (auth.uid() = user_id);
create policy "Planner events can be modified by owner"
on public.planner_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Study sessions are viewable by owner"
on public.study_sessions for select using (auth.uid() = user_id);
create policy "Study sessions can be modified by owner"
on public.study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Mastery records are viewable by owner"
on public.mastery_records for select using (auth.uid() = user_id);
create policy "Mastery records can be modified by owner"
on public.mastery_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Uploads are viewable by owner"
on public.uploads for select using (auth.uid() = user_id);
create policy "Uploads can be modified by owner"
on public.uploads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Tutor conversations are viewable by owner"
on public.tutor_conversations for select using (auth.uid() = user_id);
create policy "Tutor conversations can be modified by owner"
on public.tutor_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Tutor messages are viewable by owner"
on public.tutor_messages for select using (auth.uid() = user_id);
create policy "Tutor messages can be modified by owner"
on public.tutor_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "User settings are viewable by owner"
on public.user_settings for select using (auth.uid() = user_id);
create policy "User settings can be modified by owner"
on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
