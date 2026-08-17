-- Allows career_assessments (which also cover interviews and deadline tracking)
-- to reference a manually typed "Other" company name instead of an existing
-- career_companies row. This is additive only.

alter table public.career_assessments
  add column if not exists custom_company_name text;
