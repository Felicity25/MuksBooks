create table if not exists public.saved_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id text not null,
  saved_at timestamptz not null default now(),
  unique (user_id, resource_id)
);

create index if not exists idx_saved_resources_user_saved
on public.saved_resources (user_id, saved_at desc);

alter table public.saved_resources enable row level security;

drop policy if exists "Saved resources are viewable by owner" on public.saved_resources;
create policy "Saved resources are viewable by owner"
on public.saved_resources for select
using (auth.uid() = user_id);

drop policy if exists "Saved resources can be inserted by owner" on public.saved_resources;
create policy "Saved resources can be inserted by owner"
on public.saved_resources for insert
with check (auth.uid() = user_id);

drop policy if exists "Saved resources can be deleted by owner" on public.saved_resources;
create policy "Saved resources can be deleted by owner"
on public.saved_resources for delete
using (auth.uid() = user_id);