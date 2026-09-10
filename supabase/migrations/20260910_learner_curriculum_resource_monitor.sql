create table if not exists public.learner_curriculum_source_checks (
  source_id text primary key,
  source_url text not null,
  final_url text,
  expected_domain text not null,
  status text not null check (status in ('ACTIVE', 'NEEDS_REVIEW', 'BROKEN')),
  http_status integer,
  fingerprint text,
  changed boolean not null default false,
  reason text not null,
  checked_at timestamptz not null
);

create table if not exists public.learner_curriculum_source_candidates (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  source_url text not null,
  final_url text not null,
  previous_fingerprint text,
  candidate_fingerprint text not null,
  reason text not null,
  review_status text not null default 'NEEDS_REVIEW' check (review_status in ('NEEDS_REVIEW', 'APPROVED', 'REJECTED')),
  detected_at timestamptz not null,
  reviewed_at timestamptz,
  unique (source_id, candidate_fingerprint)
);

alter table public.learner_curriculum_source_checks enable row level security;
alter table public.learner_curriculum_source_candidates enable row level security;

comment on table public.learner_curriculum_source_checks is 'Operational link and fingerprint checks for the code-owned learner curriculum resource catalogue.';
comment on table public.learner_curriculum_source_candidates is 'Review-gated curriculum source changes. Checker output never promotes canonical resource metadata automatically.';