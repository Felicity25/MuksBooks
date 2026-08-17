-- Extend uploads table with document-tracking fields needed for tutor retrieval
alter table public.uploads add column if not exists document_id  text;
alter table public.uploads add column if not exists document_type text;
alter table public.uploads add column if not exists processing_status text default 'uploaded';
alter table public.uploads add column if not exists summary text;
alter table public.uploads add column if not exists course_code  text;
alter table public.uploads add column if not exists version      integer default 1;
alter table public.uploads add column if not exists file_hash    text;
alter table public.uploads add column if not exists chunk_count  integer default 0;
alter table public.uploads add column if not exists week         integer;
alter table public.uploads add column if not exists resource_type text;
alter table public.uploads add column if not exists topic        text;

create unique index if not exists idx_uploads_document_id on public.uploads (document_id);
create index if not exists idx_uploads_course_code    on public.uploads (course_code);
create index if not exists idx_uploads_file_hash      on public.uploads (file_hash);

-- Persistent knowledge chunks table for cloud-backed tutor retrieval
create table if not exists public.document_chunks (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  upload_id   uuid references public.uploads(id)      on delete cascade,
  document_id text not null,
  chunk_index integer not null,
  section     text,
  text        text not null,
  embedding   jsonb not null default '[]',
  keywords    jsonb not null default '[]',
  course_code text,
  created_at  timestamptz not null default now()
);

alter table public.document_chunks enable row level security;

create policy "document_chunks_owner_all"
  on public.document_chunks
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_document_chunks_user     on public.document_chunks (user_id);
create index if not exists idx_document_chunks_upload   on public.document_chunks (upload_id);
create index if not exists idx_document_chunks_document on public.document_chunks (document_id);
create index if not exists idx_document_chunks_course   on public.document_chunks (course_code);
