-- Private human decisions for review-gated university source candidates.

create table if not exists public.university_review_decisions (
  id uuid primary key default gen_random_uuid(),
  candidate_id text not null,
  institution_id text not null,
  candidate_type text not null,
  action text not null check (action in ('APPROVE', 'REJECT', 'MERGE')),
  merge_target_id text,
  reviewer_note text,
  reviewer_id text not null,
  candidate_payload jsonb not null,
  source_url text not null,
  source_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (action <> 'MERGE' or merge_target_id is not null)
);

create index if not exists idx_university_review_decisions_updated_at on public.university_review_decisions (updated_at desc);
create index if not exists idx_university_review_decisions_institution on public.university_review_decisions (institution_id);
create index if not exists idx_university_review_decisions_candidate on public.university_review_decisions (candidate_id, updated_at desc);

alter table public.university_review_decisions enable row level security;
revoke all on public.university_review_decisions from anon, authenticated;