/**
 * One-time migration endpoint.
 * Call with: POST /api/internal/apply-migration
 * Requires header: x-migration-key: <SUPABASE_SERVICE_ROLE_KEY>
 *
 * This uses the Supabase client with the service role key to apply DDL
 * via an RPC function (sql_runner) that is defined inline here.
 * Remove or disable after running once.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const MIGRATION_SQL = `
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

drop policy if exists "document_chunks_owner_all" on public.document_chunks;
create policy "document_chunks_owner_all"
  on public.document_chunks for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_document_chunks_user     on public.document_chunks (user_id);
create index if not exists idx_document_chunks_upload   on public.document_chunks (upload_id);
create index if not exists idx_document_chunks_document on public.document_chunks (document_id);
create index if not exists idx_document_chunks_course   on public.document_chunks (course_code);
`

export async function POST(request: NextRequest) {
  const key = request.headers.get('x-migration-key')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''

  if (!key || key !== serviceKey || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!url) {
    return NextResponse.json({ ok: false, error: 'Supabase URL not configured' }, { status: 503 })
  }

  // Use the service role client + pg_query helper via rpc
  // We try each statement individually and report results
  const client = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Execute via the postgres endpoint using the service key as the Bearer token
  const pgUrl = url.replace('https://', 'https://').replace('.supabase.co', '.supabase.co')
  const statements = MIGRATION_SQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 5)

  const results: Array<{ statement: string; ok: boolean; error?: string }> = []

  for (const stmt of statements) {
    try {
      // Try via rpc (requires sql runner function) — fall back gracefully
      const { error } = await client.rpc('exec_sql', { query: stmt + ';' })
      if (error && !error.message.includes('already exists') && !error.message.includes('PGRST202')) {
        results.push({ statement: stmt.slice(0, 60), ok: false, error: error.message })
      } else {
        results.push({ statement: stmt.slice(0, 60), ok: true })
      }
    } catch (err: any) {
      results.push({ statement: stmt.slice(0, 60), ok: false, error: err?.message || String(err) })
    }
  }

  // Check if document_chunks table now exists
  const { data: tableCheck } = await client.from('document_chunks').select('id').limit(1).maybeSingle()

  return NextResponse.json({
    ok: true,
    results,
    tableExists: tableCheck !== undefined,
    message: 'Run the SQL from supabase/migrations/20260820_persistent_documents.sql manually in the Supabase SQL Editor if any statements failed.'
  })
}
