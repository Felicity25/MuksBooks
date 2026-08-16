import Parser from 'rss-parser'
import { NEWS_SOURCES } from './sources.ts'
import {
  classifyCategory,
  classifyCountry,
  classifyImportance,
  classifyJurisdictions,
  classifyPracticeAreas,
  classifyActuarialConcepts,
  isLikelyCareerOpportunity,
  classifyRegulatoryStatus,
  extractConsultationCloseDate,
  extractEffectiveDate
} from './classify.ts'
import { generateActuarialImpact, generateWhyItMatters, maybeEnrichWhyItMatters } from './relevance.ts'
import { upsertNewsItem } from './store.ts'
import { upsertPrismaBackupNews } from './prisma-backup.ts'
import type { NewsItem, NewsQueryFilters, NewsSource } from './types.ts'
import { appendLog } from '../logging.ts'
import crypto from 'crypto'

const parser = new Parser({
  customFields: {
    item: [['author', 'authors', { keepArray: true }]]
  }
})

function isValidUrl(value?: string) {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isPlaceholderArticle(title: string) {
  return /^(resource feed|newsroom feed|event feed)$/i.test(title.trim())
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchFeedWithRetry(source: NewsSource, maxAttempts = 2) {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(
        source.feedUrl,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MuksBooksNewsBot/1.0)',
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml'
          },
          redirect: 'follow'
        },
        12000
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const xml = (await response.text()).replace(/version="\s+([\d.]+)"/g, 'version="$1"')
      return parser.parseString(xml)
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

async function fetchFeed(source: NewsSource) {
  return fetchFeedWithRetry(source)
}

function summaryFrom(item: any): string {
  const raw = item.contentSnippet || item.summary || item.content || ''
  const text = raw.replace(/\s+/g, ' ').trim()
  const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ')
  return (sentences || text).slice(0, 320)
}

export interface CollectResult {
  collected: number
  stored: number
  logs: string[]
}

export async function collectNews(): Promise<CollectResult> {
  const logs: string[] = []
  let collected = 0
  let stored = 0

  for (const source of NEWS_SOURCES) {
    try {
      const feed = await fetchFeed(source)
      const items = feed.items || []
      let sourceStored = 0
      let parseFailures = 0

      for (const item of items) {
        try {
          const title = (item.title || '').trim()
          const rawItem = item as unknown as Record<string, unknown>
          const url = String(rawItem.link ?? rawItem.id ?? '')
          if (!title || !isValidUrl(url) || isPlaceholderArticle(title)) continue

          const summary = summaryFrom(item)

          // The events feed is useful only when it contains real opportunities.
          if (source.id === 'the-actuary-events' && !isLikelyCareerOpportunity(title, summary)) {
            continue
          }

          const category = classifyCategory(title, summary, source)
          const country = classifyCountry(title, summary, source)
          const practiceAreas = classifyPracticeAreas(title, summary)
          const actuarialConcepts = classifyActuarialConcepts(title, summary)
          const jurisdictions = classifyJurisdictions(title, summary)
          const importance = classifyImportance(title, summary, source)
          const fallbackWhy = generateWhyItMatters(category, title, summary)
          const whyItMatters = await maybeEnrichWhyItMatters(category, title, summary, fallbackWhy)
          const actuarialImpact = generateActuarialImpact(actuarialConcepts, practiceAreas)

          const isRegulation = category === 'REGULATION'
          const status = isRegulation ? classifyRegulatoryStatus(title, summary) : undefined
          const effectiveDate = isRegulation ? extractEffectiveDate(title, summary) : undefined
          const consultationCloseDate = isRegulation ? extractConsultationCloseDate(title, summary) : undefined

          const isResearch = category === 'RESEARCH'
          const authors = isResearch ? (item.authors || []).map((a: any) => (typeof a === 'string' ? a : a?.name || a?._ || '')).filter(Boolean) : []

          collected += 1
          const result = upsertNewsItem({
            title,
            summary,
            category,
            country,
            jurisdictions,
            practiceAreas,
            actuarialConcepts,
            sourceName: source.name,
            sourceType: source.sourceType,
            sourceTier: source.tier,
            sourceUrl: source.feedUrl,
            url,
            publishedAt: item.isoDate || item.pubDate || null,
            importance,
            whyItMatters,
            actuarialImpact,
            status,
            effectiveDate,
            consultationCloseDate,
            researchAuthors: authors,
            researchInstitution: isResearch ? source.name : undefined,
            researchQuestion: isResearch ? title : undefined,
            researchKeyFinding: isResearch ? summary : undefined,
            researchDifficulty: isResearch ? 'TECHNICAL' : undefined,
            confidence: 0.7
          })

          await upsertPrismaBackupNews({
            title,
            source: source.name,
            publishedDate: item.isoDate || item.pubDate || null,
            summary,
            url,
            category,
            relevance: whyItMatters
          })

          if (result.created) sourceStored += 1
        } catch (error) {
          parseFailures += 1
          logs.push(`${source.name}: skipped article (${error instanceof Error ? error.message : String(error)})`)
        }
      }

      stored += sourceStored
      const sourceLog = `${source.name}: ${items.length} items fetched, ${sourceStored} new, ${parseFailures} skipped`
      logs.push(sourceLog)
      await appendLog('news', 'News source processed', {
        source: source.name,
        feedUrl: source.feedUrl,
        fetchedCount: items.length,
        storedCount: sourceStored,
        skippedCount: parseFailures
      })
    } catch (error: any) {
      logs.push(`${source.name}: FAILED (${error?.message || error})`)
      await appendLog('news', 'News source failed', {
        source: source.name,
        feedUrl: source.feedUrl,
        error: error?.message || String(error)
      })
    }
  }

  await appendLog('news', 'News collection completed', {
    collected,
    stored,
    sourceCount: NEWS_SOURCES.length
  })

  return { collected, stored, logs }
}

function previewMatchesFilters(item: NewsItem, filters: NewsQueryFilters) {
  if (filters.category && filters.category !== 'All' && item.category !== filters.category) return false
  if (filters.country && item.country !== filters.country) return false
  if (filters.concept && !item.actuarialConcepts.includes(filters.concept)) return false
  if (filters.practiceArea && !item.practiceAreas.includes(filters.practiceArea)) return false

  if (filters.range && item.publishedAt) {
    const days = filters.range === 'today' ? 1 : filters.range === '7d' ? 7 : 30
    if (new Date(item.publishedAt).getTime() < Date.now() - days * 24 * 60 * 60 * 1000) return false
  }

  if (filters.q) {
    const text = `${item.title} ${item.summary} ${item.sourceName} ${item.actuarialConcepts.join(' ')} ${item.practiceAreas.join(' ')}`.toLowerCase()
    const words = filters.q.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (!words.every((word) => text.includes(word))) return false
  }

  return true
}

async function previewSource(source: NewsSource, filters: NewsQueryFilters): Promise<NewsItem[]> {
  const previewItems: NewsItem[] = []

  try {
    const feed = await fetchFeed(source)
    const items = feed.items || []

    for (const item of items) {
      try {
        const title = (item.title || '').trim()
        const rawItem = item as unknown as Record<string, unknown>
        const url = String(rawItem.link ?? rawItem.id ?? '')
        if (!title || !isValidUrl(url) || isPlaceholderArticle(title)) continue

        const summary = summaryFrom(item)
        if (source.id === 'the-actuary-events' && !isLikelyCareerOpportunity(title, summary)) continue

        const category = classifyCategory(title, summary, source)
        const country = classifyCountry(title, summary, source)
        const practiceAreas = classifyPracticeAreas(title, summary)
        const actuarialConcepts = classifyActuarialConcepts(title, summary)
        const jurisdictions = classifyJurisdictions(title, summary)
        const importance = classifyImportance(title, summary, source)
        const whyItMatters = generateWhyItMatters(category, title, summary)
        const actuarialImpact = generateActuarialImpact(actuarialConcepts, practiceAreas)
        const isRegulation = category === 'REGULATION'

        const previewItem: NewsItem = {
          id: `preview_${crypto.createHash('sha1').update(url).digest('hex').slice(0, 12)}`,
          clusterKey: title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).slice(0, 8).join('-'),
          title,
          summary,
          category,
          subcategories: [],
          country,
          jurisdictions,
          practiceAreas,
          actuarialConcepts,
          sourceName: source.name,
          sourceType: source.sourceType,
          sourceTier: source.tier,
          sourceUrl: source.feedUrl,
          url,
          publishedAt: item.isoDate || item.pubDate || null,
          discoveredAt: new Date().toISOString(),
          lastCheckedAt: new Date().toISOString(),
          sourceUpdatedAt: null,
          importance,
          whyItMatters,
          actuarialImpact,
          affectedGroups: [],
          effectiveDate: isRegulation ? extractEffectiveDate(title, summary) : undefined,
          consultationCloseDate: isRegulation ? extractConsultationCloseDate(title, summary) : undefined,
          status: isRegulation ? classifyRegulatoryStatus(title, summary) : undefined,
          researchAuthors: [],
          relatedCompanies: [],
          relatedRegulators: [],
          supportingSources: [],
          confidence: 0.5
        }

        if (previewMatchesFilters(previewItem, filters)) previewItems.push(previewItem)
      } catch {
        // Skip malformed entries for preview mode.
      }
    }
  } catch {
    // Skip failed source in preview mode.
  }

  return previewItems
}

export async function collectNewsPreview(limit = 60, filters: NewsQueryFilters = {}): Promise<NewsItem[]> {
  const results = await Promise.all(NEWS_SOURCES.map((source) => previewSource(source, filters)))
  return results
    .flat()
    .sort((left, right) => new Date(right.publishedAt || right.discoveredAt).getTime() - new Date(left.publishedAt || left.discoveredAt).getTime())
    .slice(0, limit)
}
