import crypto from 'crypto'
import { getDb, nowIso } from './db.ts'
import type { BriefItem, NewsCategory, NewsCountry, NewsItem, NewsQueryFilters, SupportingSource } from './types.ts'
import { scoreNewsItem } from './score.ts'
import { getInterestKeywords } from './personalize.ts'
import { isLikelyCareerOpportunity } from './classify.ts'

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

function json(value: unknown) {
  return JSON.stringify(value ?? null)
}

function parseArray(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseSupportingSources(value: string | null): SupportingSource[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function rowToItem(row: any): NewsItem {
  return {
    id: row.id,
    clusterKey: row.cluster_key,
    title: row.title,
    summary: row.summary || '',
    category: row.category,
    subcategories: parseArray(row.subcategories),
    country: row.country,
    jurisdictions: parseArray(row.jurisdictions),
    practiceAreas: parseArray(row.practice_areas),
    actuarialConcepts: parseArray(row.actuarial_concepts),
    sourceName: row.source_name,
    sourceType: row.source_type,
    sourceTier: row.source_tier,
    sourceUrl: row.source_url,
    url: row.url,
    publishedAt: row.published_at,
    discoveredAt: row.discovered_at,
    lastCheckedAt: row.last_checked_at,
    sourceUpdatedAt: row.source_updated_at,
    importance: row.importance,
    whyItMatters: row.why_it_matters || '',
    actuarialImpact: row.actuarial_impact || undefined,
    affectedGroups: parseArray(row.affected_groups),
    effectiveDate: row.effective_date || undefined,
    consultationCloseDate: row.consultation_close_date || undefined,
    status: row.status || undefined,
    researchAuthors: parseArray(row.research_authors),
    researchInstitution: row.research_institution || undefined,
    researchQuestion: row.research_question || undefined,
    researchKeyFinding: row.research_key_finding || undefined,
    researchDifficulty: row.research_difficulty || undefined,
    relatedCompanies: parseArray(row.related_companies),
    relatedRegulators: parseArray(row.related_regulators),
    supportingSources: parseSupportingSources(row.supporting_sources),
    confidence: row.confidence ?? 0.6
  }
}

/** Normalizes a title into a clustering key so multiple publishers covering the same event collapse into one card. */
export function computeClusterKey(title: string): string {
  const stopwords = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'for', 'to', 'and', 'is', 'at', 'by'])
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word && !stopwords.has(word))
    .slice(0, 8)
    .join('-')
}

export interface UpsertInput {
  title: string
  summary: string
  category: NewsCategory
  subcategories?: string[]
  country: NewsCountry
  jurisdictions?: string[]
  practiceAreas?: string[]
  actuarialConcepts?: string[]
  sourceName: string
  sourceType: string
  sourceTier: number
  sourceUrl?: string
  url: string
  publishedAt: string | null
  importance: string
  whyItMatters: string
  actuarialImpact?: string
  affectedGroups?: string[]
  effectiveDate?: string
  consultationCloseDate?: string
  status?: string
  researchAuthors?: string[]
  researchInstitution?: string
  researchQuestion?: string
  researchKeyFinding?: string
  researchDifficulty?: string
  confidence?: number
}

/** Upserts by URL; if a similar story already exists (same cluster) from a source, merges as supporting coverage instead of creating a duplicate card. */
export function upsertNewsItem(input: UpsertInput): { id: string; created: boolean } {
  const db = getDb()
  const now = nowIso()
  const clusterKey = computeClusterKey(input.title)

  const existingByUrl = db.prepare('SELECT * FROM news_items WHERE url = ?').get(input.url) as any

  if (existingByUrl) {
    db.prepare(
      `UPDATE news_items SET summary = ?, last_checked_at = ?, source_updated_at = CASE WHEN summary != ? THEN ? ELSE source_updated_at END, updated_at = ? WHERE id = ?`
    ).run(input.summary, now, existingByUrl.summary, now, now, existingByUrl.id)
    return { id: existingByUrl.id, created: false }
  }

  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  const clusterMatch = db
    .prepare('SELECT * FROM news_items WHERE cluster_key = ? AND discovered_at >= ? ORDER BY source_tier ASC LIMIT 1')
    .get(clusterKey, fiveDaysAgo) as any

  if (clusterMatch) {
    const supporting = parseSupportingSources(clusterMatch.supporting_sources)
    if (!supporting.some((s) => s.url === input.url)) {
      supporting.push({ name: input.sourceName, url: input.url })
    }

    if (input.sourceTier < clusterMatch.source_tier) {
      // New source is more authoritative — promote it to primary, demote the old primary into supporting sources.
      supporting.push({ name: clusterMatch.source_name, url: clusterMatch.url })
      db.prepare(
        `UPDATE news_items SET title = ?, summary = ?, source_name = ?, source_type = ?, source_tier = ?, source_url = ?, url = ?,
          why_it_matters = ?, importance = ?, last_checked_at = ?, source_updated_at = ?, supporting_sources = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        input.title,
        input.summary,
        input.sourceName,
        input.sourceType,
        input.sourceTier,
        input.sourceUrl || null,
        input.url,
        input.whyItMatters,
        input.importance,
        now,
        now,
        json(supporting),
        now,
        clusterMatch.id
      )
    } else {
      db.prepare('UPDATE news_items SET last_checked_at = ?, supporting_sources = ?, updated_at = ? WHERE id = ?').run(
        now,
        json(supporting),
        now,
        clusterMatch.id
      )
    }
    return { id: clusterMatch.id, created: false }
  }

  const newId = id('news')
  db.prepare(
    `INSERT INTO news_items (
      id, cluster_key, title, summary, category, subcategories, country, jurisdictions, practice_areas, actuarial_concepts,
      source_name, source_type, source_tier, source_url, url, published_at, discovered_at, last_checked_at, source_updated_at,
      importance, why_it_matters, actuarial_impact, affected_groups, effective_date, consultation_close_date, status,
      research_authors, research_institution, research_question, research_key_finding, research_difficulty,
      related_companies, related_regulators, supporting_sources, confidence, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId,
    clusterKey,
    input.title,
    input.summary,
    input.category,
    json(input.subcategories || []),
    input.country,
    json(input.jurisdictions || []),
    json(input.practiceAreas || []),
    json(input.actuarialConcepts || []),
    input.sourceName,
    input.sourceType,
    input.sourceTier,
    input.sourceUrl || null,
    input.url,
    input.publishedAt,
    now,
    now,
    null,
    input.importance,
    input.whyItMatters,
    input.actuarialImpact || null,
    json(input.affectedGroups || []),
    input.effectiveDate || null,
    input.consultationCloseDate || null,
    input.status || null,
    json(input.researchAuthors || []),
    input.researchInstitution || null,
    input.researchQuestion || null,
    input.researchKeyFinding || null,
    input.researchDifficulty || null,
    json([]),
    json([]),
    json([]),
    input.confidence ?? 0.6,
    now,
    now
  )
  return { id: newId, created: true }
}

function rangeToFromIso(range?: string): string | undefined {
  if (!range) return undefined
  const days = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : undefined
  if (!days) return undefined
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export function queryNewsItems(filters: NewsQueryFilters = {}): NewsItem[] {
  const db = getDb()
  const clauses: string[] = []
  const params: any[] = []

  if (filters.category && filters.category !== 'All') {
    clauses.push('category = ?')
    params.push(filters.category)
  }
  if (filters.country) {
    clauses.push('country = ?')
    params.push(filters.country)
  }

  const from = filters.from || rangeToFromIso(filters.range)
  if (from) {
    clauses.push('(published_at IS NULL OR published_at >= ?)')
    params.push(from)
  }
  if (filters.to) {
    clauses.push('published_at <= ?')
    params.push(filters.to)
  }
  if (filters.concept) {
    clauses.push('actuarial_concepts LIKE ?')
    params.push(`%${filters.concept}%`)
  }
  if (filters.practiceArea) {
    clauses.push('practice_areas LIKE ?')
    params.push(`%${filters.practiceArea}%`)
  }

  if (filters.q) {
    const words = filters.q.trim().split(/\s+/).filter(Boolean).slice(0, 6)
    for (const word of words) {
      clauses.push(
        `(LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(source_name) LIKE ? OR LOWER(actuarial_concepts) LIKE ? OR LOWER(practice_areas) LIKE ? OR LOWER(country) LIKE ?)`
      )
      const like = `%${word.toLowerCase()}%`
      params.push(like, like, like, like, like, like)
    }
  }

  if (filters.savedOnly && filters.userId) {
    clauses.push('id IN (SELECT news_id FROM news_saved_items WHERE user_id = ?)')
    params.push(filters.userId)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const limit = Math.max(1, Math.min(filters.limit || 200, 500))

  const rows = db
    .prepare(`SELECT * FROM news_items ${where} ORDER BY COALESCE(published_at, discovered_at) DESC LIMIT ?`)
    .all(...params, limit) as any[]

  let items = rows.map(rowToItem)
  if (filters.category === 'CAREERS') {
    // Guard against stale rows previously labeled as CAREERS before stricter opportunity classification.
    items = items.filter((item) => item.sourceName !== 'The Actuary - Events' && isLikelyCareerOpportunity(item.title, item.summary || ''))
  }
  const interestKeywords = getInterestKeywords(filters.userId)
  return items.sort((a, b) => scoreNewsItem(b, { interestKeywords }) - scoreNewsItem(a, { interestKeywords }))
}

export function getDailyBrief(limit = 5): BriefItem[] {
  const items = queryNewsItems({ range: '7d', limit: 100 })
  return items.slice(0, limit).map((item) => ({
    id: item.id,
    title: item.title,
    summary: (item.whyItMatters || item.summary).slice(0, 180),
    category: item.category
  }))
}

export function getSinceYesterday(limit = 8): string[] {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const db = getDb()
  const rows = db
    .prepare('SELECT title, source_name FROM news_items WHERE discovered_at >= ? ORDER BY discovered_at DESC LIMIT ?')
    .all(since, limit) as Array<{ title: string; source_name: string }>
  return rows.map((r) => `${r.source_name}: ${r.title}`)
}

export function getConceptCounts(): Array<{ name: string; count: number }> {
  const db = getDb()
  const rows = db.prepare('SELECT actuarial_concepts FROM news_items').all() as Array<{ actuarial_concepts: string }>
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const concept of parseArray(row.actuarial_concepts)) {
      counts.set(concept, (counts.get(concept) || 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
}

export function toggleSavedItem(userId: string, newsId: string): { saved: boolean } {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM news_saved_items WHERE user_id = ? AND news_id = ?').get(userId, newsId) as any
  if (existing) {
    db.prepare('DELETE FROM news_saved_items WHERE id = ?').run(existing.id)
    return { saved: false }
  }
  db.prepare('INSERT INTO news_saved_items (id, user_id, news_id, created_at) VALUES (?, ?, ?, ?)').run(
    id('saved'),
    userId,
    newsId,
    nowIso()
  )
  return { saved: true }
}

export function listSavedIds(userId: string): string[] {
  const db = getDb()
  const rows = db.prepare('SELECT news_id FROM news_saved_items WHERE user_id = ?').all(userId) as Array<{ news_id: string }>
  return rows.map((r) => r.news_id)
}

export function toggleFollowedTopic(userId: string, topic: string): { followed: boolean } {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM news_followed_topics WHERE user_id = ? AND topic = ?').get(userId, topic) as any
  if (existing) {
    db.prepare('DELETE FROM news_followed_topics WHERE id = ?').run(existing.id)
    return { followed: false }
  }
  db.prepare('INSERT INTO news_followed_topics (id, user_id, topic, created_at) VALUES (?, ?, ?, ?)').run(
    id('follow'),
    userId,
    topic,
    nowIso()
  )
  return { followed: true }
}

export function listFollowedTopics(userId: string): string[] {
  const db = getDb()
  const rows = db.prepare('SELECT topic FROM news_followed_topics WHERE user_id = ?').all(userId) as Array<{ topic: string }>
  return rows.map((r) => r.topic)
}
