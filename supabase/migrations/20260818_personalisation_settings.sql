alter table public.user_settings
  add column if not exists preferences jsonb not null default '{}'::jsonb;

comment on column public.user_settings.preferences is
  'Versioned interface, homepage widget, quick action, and proactivity preferences.';