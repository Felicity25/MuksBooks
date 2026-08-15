import { NextRequest, NextResponse } from 'next/server'
import { listSavedIds, toggleSavedItem } from '@/lib/news/store'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const userId = new URL(request.url).searchParams.get('userId') || 'default'
  return NextResponse.json({ ok: true, savedIds: listSavedIds(userId) })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const userId = body.userId || 'default'
  const newsId = body.newsId
  if (!newsId) {
    return NextResponse.json({ ok: false, error: 'newsId is required' }, { status: 400 })
  }
  const result = toggleSavedItem(userId, newsId)
  return NextResponse.json({ ok: true, ...result })
}
