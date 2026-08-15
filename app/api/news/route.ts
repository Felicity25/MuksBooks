import { NextRequest, NextResponse } from 'next/server'
import { collectNews } from '@/lib/news/pipeline'
import { getConceptCounts, getDailyBrief, getSinceYesterday, listSavedIds, queryNewsItems } from '@/lib/news/store'
import { getDb } from '@/lib/news/db'
import type { NewsQueryFilters } from '@/lib/news/types'
import { appendLog } from '@/lib/logging'

export const runtime = 'nodejs'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_LIMIT = 60

let refreshPromise: Promise<unknown> | null = null

function startBackgroundRefreshIfNeeded() {
  if (refreshPromise) return
  refreshPromise = collectNews()
    .catch((error) => console.error('Background news refresh failed:', error))
    .finally(() => {
      refreshPromise = null
    })
}

function isStale() {
  try {
    const db = getDb()
    const row = db.prepare('SELECT MAX(last_checked_at) as last FROM news_items').get() as { last: string | null }
    if (!row?.last) return true
    return Date.now() - new Date(row.last).getTime() >= ONE_DAY_MS
  } catch {
    return true
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || 'default'

  const filters: NewsQueryFilters = {
    category: (searchParams.get('category') as any) || 'All',
    country: (searchParams.get('country') as any) || undefined,
    range: (searchParams.get('range') as any) || undefined,
    q: searchParams.get('q') || undefined,
    concept: searchParams.get('concept') || undefined,
    practiceArea: searchParams.get('practiceArea') || undefined,
    savedOnly: searchParams.get('savedOnly') === 'true',
    userId,
    limit: DEFAULT_LIMIT
  }

  try {
    try {
      if (isStale()) {
        startBackgroundRefreshIfNeeded()
      }
    } catch (error) {
      console.warn('News staleness check failed; continuing with cached data.', error)
    }

    const items = queryNewsItems(filters)
    const brief = getDailyBrief()
    const sinceYesterday = getSinceYesterday()
    const concepts = getConceptCounts()
    const savedIds = listSavedIds(userId)

    try {
      await appendLog('news', 'News API query served', {
        category: filters.category,
        country: filters.country || null,
        range: filters.range || null,
        q: filters.q || null,
        concept: filters.concept || null,
        practiceArea: filters.practiceArea || null,
        resultCount: items.length,
        briefCount: brief.length
      })
    } catch (logError) {
      console.warn('News API logging failed:', logError)
    }

    if (items.length === 0) {
      return NextResponse.json({
        ok: false,
        reason: 'NO_RESULTS',
        message: 'No relevant articles were found. Try refreshing or broadening the category.',
        items: [],
        brief: [],
        sinceYesterday,
        concepts,
        savedIds
      })
    }

    return NextResponse.json({ ok: true, items, brief, sinceYesterday, concepts, savedIds })
  } catch (error) {
    console.error('Failed to fetch news:', error)

    try {
      await appendLog('news', 'News API query failed', {
        category: filters.category,
        country: filters.country || null,
        range: filters.range || null,
        q: filters.q || null,
        error: error instanceof Error ? error.message : String(error)
      })
    } catch {
      // Logging failure must not stop the API from returning a structured error payload.
    }

    try {
      const fallbackItems = queryNewsItems({ userId, limit: 20 })
      if (fallbackItems.length > 0) {
        return NextResponse.json({
          ok: false,
          reason: 'FALLBACK_RESULTS',
          message: 'Live filtering failed, showing the latest cached articles instead.',
          items: fallbackItems,
          brief: getDailyBrief(),
          sinceYesterday: getSinceYesterday(),
          concepts: getConceptCounts(),
          savedIds: listSavedIds(userId)
        })
      }
    } catch {
      // Ignore fallback failure and return explicit error below.
    }

    return NextResponse.json({
      ok: false,
      reason: 'QUERY_FAILED',
      message: 'News could not be loaded right now.',
      items: [],
      brief: [],
      sinceYesterday: [],
      concepts: [],
      savedIds: []
    }, { status: 500 })
  }
}