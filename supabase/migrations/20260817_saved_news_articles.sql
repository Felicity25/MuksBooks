create table if not exists public.saved_news_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_url text not null,
  title text not null,
  summary text not null default '',
  source_name text not null,
  category text not null,
  published_at timestamptz,
  image_url text,
  article_data jsonb not null,
  saved_at timestamptz not null default now(),
  unique (user_id, article_url)
);

create index if not exists idx_saved_news_articles_user_published
on public.saved_news_articles (user_id, published_at desc, saved_at desc);

alter table public.saved_news_articles enable row level security;

drop policy if exists "Saved news is viewable by owner" on public.saved_news_articles;
create policy "Saved news is viewable by owner"
on public.saved_news_articles for select
using (auth.uid() = user_id);

drop policy if exists "Saved news can be inserted by owner" on public.saved_news_articles;
create policy "Saved news can be inserted by owner"
on public.saved_news_articles for insert
with check (auth.uid() = user_id);

drop policy if exists "Saved news can be deleted by owner" on public.saved_news_articles;
create policy "Saved news can be deleted by owner"
on public.saved_news_articles for delete
using (auth.uid() = user_id);