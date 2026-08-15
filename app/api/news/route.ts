import { NextRequest, NextResponse } from 'next/server'
import type { NewsItem, NewsQueryFilters } from '@/lib/news/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 60

type NewsDependencies = Awaited<ReturnType<typeof loadNewsDependencies>>

type NewsResponse = {
  success: boolean
  ok: boolean
  articles: NewsItem[]
  items: NewsItem[]
  updatedAt: string
  sourcesChecked: number
  brief: Array<{ id: string; title: string; summary: string; category: string }>
  sinceYesterday: string[]
  concepts: Array<{ name: string; count: number }>
  savedIds: string[]
  message?: string
  error?: string
  reason?: string
}

let newsDependenciesPromise: Promise<{
  queryNewsItems: NewsDependencies['queryNewsItems']
  getDailyBrief: NewsDependencies['getDailyBrief']
  getSinceYesterday: NewsDependencies['getSinceYesterday']
  getConceptCounts: NewsDependencies['getConceptCounts']
  listSavedIds: NewsDependencies['listSavedIds']
  appendLog: NewsDependencies['appendLog']
}> | null = null

async function loadNewsDependencies() {
  if (!newsDependenciesPromise) {
    newsDependenciesPromise = Promise.all([
      import('@/lib/news/store'),
      import('@/lib/logging')
    ]).then(([storeModule, loggingModule]) => ({
      queryNewsItems: storeModule.queryNewsItems,
      getDailyBrief: storeModule.getDailyBrief,
      getSinceYesterday: storeModule.getSinceYesterday,
      getConceptCounts: storeModule.getConceptCounts,
      listSavedIds: storeModule.listSavedIds,
      appendLog: loggingModule.appendLog
    }))
  }

  return newsDependenciesPromise
}

function buildResponse(payload: NewsResponse, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  })
}

function toNewsResponse(items: NewsItem[], userId: string, dependencies: NewsDependencies): NewsResponse {
  const brief = dependencies.getDailyBrief()
  const sinceYesterday = dependencies.getSinceYesterday()
  const concepts = dependencies.getConceptCounts()
  const savedIds = dependencies.listSavedIds(userId)
  const updatedAt = items[0]?.lastCheckedAt || new Date().toISOString()

  return {
    success: true,
    ok: true,
    articles: items,
    items,
    updatedAt,
    sourcesChecked: new Set(items.map((item) => item.sourceName)).size,
    brief,
    sinceYesterday,
    concepts,
    savedIds
  }
}

function toEmptyNewsResponse(message: string, userId: string, dependencies: NewsDependencies): NewsResponse {
  return {
    success: true,
    ok: true,
    articles: [],
    items: [],
    updatedAt: new Date().toISOString(),
    sourcesChecked: 0,
    brief: dependencies.getDailyBrief(),
    sinceYesterday: dependencies.getSinceYesterday(),
    concepts: dependencies.getConceptCounts(),
    savedIds: dependencies.listSavedIds(userId),
    message
  }
}

function toErrorNewsResponse(message: string): NewsResponse {
  return {
    success: false,
    ok: false,
    articles: [],
    items: [],
    updatedAt: new Date().toISOString(),
    sourcesChecked: 0,
    brief: [],
    sinceYesterday: [],
    concepts: [],
    savedIds: [],
    error: message
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
    const dependencies = await loadNewsDependencies()
    const items = dependencies.queryNewsItems(filters)

    try {
      await dependencies.appendLog('news', 'News API query served', {
        category: filters.category,
        country: filters.country || null,
        range: filters.range || null,
        q: filters.q || null,
        concept: filters.concept || null,
        practiceArea: filters.practiceArea || null,
        resultCount: items.length,
        briefCount: dependencies.getDailyBrief().length,
        nodeVersion: process.version
      })
    } catch (logError) {
      console.warn('News API logging failed:', logError)
    }

    if (items.length === 0) {
      return buildResponse(toEmptyNewsResponse('No qualifying news items are available right now. The feed will refresh automatically when the next collection run succeeds.', userId, dependencies))
    }

    return buildResponse(toNewsResponse(items, userId, dependencies))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to fetch news:', error)

    try {
      const dependencies = await loadNewsDependencies()
      await dependencies.appendLog('news', 'News API query failed', {
        category: filters.category,
        country: filters.country || null,
        range: filters.range || null,
        q: filters.q || null,
        error: message,
        nodeVersion: process.version
      })
    } catch {
      // Logging failure must not stop the API from returning a structured error payload.
    }

    return buildResponse(toErrorNewsResponse(`News could not be loaded right now: ${message}`), 500)
  }
}