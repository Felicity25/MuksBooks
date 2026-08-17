import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { NewsItem, SavedNewsItem } from '@/lib/news/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SavedNewsRow = {
  article_url: string
  article_data: NewsItem
  saved_at: string
}

type AuthenticatedClient =
  | { ok: true; client: NonNullable<ReturnType<typeof createSupabaseServerClient>>; user: { id: string } }
  | { ok: false; error: string; status: number }

async function authenticatedClient(): Promise<AuthenticatedClient> {
  const client = createSupabaseServerClient()
  if (!client) return { ok: false, error: 'Supabase is not configured.', status: 503 }

  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return { ok: false, error: 'Authentication required', status: 401 }
  return { ok: true, client, user }
}

function unauthorized(error: string, status: number) {
  return NextResponse.json({ ok: false, error, code: status === 401 ? 'UNAUTHENTICATED' : 'SAVED_NEWS_UNAVAILABLE' }, { status })
}

export async function GET() {
  const auth = await authenticatedClient()
  if (!auth.ok) return unauthorized(auth.error, auth.status)

  const { data, error } = await auth.client
    .from('saved_news_articles')
    .select('article_url, article_data, saved_at')
    .eq('user_id', auth.user.id)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('saved_at', { ascending: false })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const rows = (data || []) as unknown as SavedNewsRow[]
  const items: SavedNewsItem[] = rows.map((row) => ({ ...row.article_data, savedAt: row.saved_at }))
  return NextResponse.json({ ok: true, items, savedUrls: rows.map((row) => row.article_url) })
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedClient()
  if (!auth.ok) return unauthorized(auth.error, auth.status)

  const body = await request.json().catch(() => null) as { article?: NewsItem } | null
  const article = body?.article
  if (!article?.url || !article.title || !article.sourceName || !article.category) {
    return NextResponse.json({ ok: false, error: 'A complete article snapshot is required.' }, { status: 400 })
  }

  const publishedAt = article.publishedAt && !Number.isNaN(new Date(article.publishedAt).getTime())
    ? article.publishedAt
    : null

  const { error } = await auth.client.from('saved_news_articles').insert({
    user_id: auth.user.id,
    article_url: article.url,
    title: article.title,
    summary: article.summary || '',
    source_name: article.sourceName,
    category: article.category,
    published_at: publishedAt,
    article_data: article
  })

  if (error && error.code !== '23505') {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, saved: true, duplicate: error?.code === '23505' })
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticatedClient()
  if (!auth.ok) return unauthorized(auth.error, auth.status)

  const body = await request.json().catch(() => null) as { url?: string } | null
  if (!body?.url) return NextResponse.json({ ok: false, error: 'Article URL is required.' }, { status: 400 })

  const { error } = await auth.client
    .from('saved_news_articles')
    .delete()
    .eq('user_id', auth.user.id)
    .eq('article_url', body.url)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, saved: false })
}
