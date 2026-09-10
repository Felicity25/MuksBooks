alter table public.user_settings
  add column if not exists learner_profile jsonb;

comment on column public.user_settings.learner_profile is
  'Account-owned learner academic profile: curriculum, level, subjects, school details, and learner planning data. Null preserves existing users until setup.';

create index if not exists idx_user_settings_learner_curriculum
  on public.user_settings ((learner_profile ->> 'curriculum'))
  where learner_profile is not null;
