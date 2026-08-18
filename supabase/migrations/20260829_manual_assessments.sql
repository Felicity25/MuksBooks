-- Allow manually-recorded assessments (not just ones auto-extracted from unit guides) and let
-- Planner tasks (work sessions) stay linked back to the assessment they were scheduled for.

alter table public.assessments add column if not exists estimated_minutes integer;
alter table public.assessments add column if not exists notes text;
alter table public.assessments add column if not exists due_time_known boolean not null default true;
alter table public.assessments add column if not exists source text not null default 'manual';

alter table public.tasks add column if not exists assessment_id uuid references public.assessments(id) on delete set null;
create index if not exists idx_tasks_assessment_id on public.tasks (assessment_id);
