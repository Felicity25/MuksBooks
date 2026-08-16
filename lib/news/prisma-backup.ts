import type { NewsCategory, NewsItem, NewsQueryFilters } from './types'

type PrismaNewsRow = {
  id: string
  title: string
  source: string
  publishedDate: Date
  summary: string
  url: string
  category: string
  relevance: string | null
}

async function getPrismaClient() {
  if (!process.env.DATABASE_URL) return null
  try {
    const { prisma } = await import('@/lib/prisma')
    return prisma
  } catch {
    return null
  }
}

function asNewsCategory(value: string): NewsCategory {
  const known = new Set<NewsCategory>([
    'INSURANCE',
    'RISK_MANAGEMENT',
    'FINANCIAL_MARKETS',
    'AI',
    'REGULATION',
    'SUPERANNUATION_PENSIONS',
    'CLIMATE_RISK',
    'CAREERS',
    'RESEARCH'
  ])
  const upper = String(value || '').toUpperCase()
  return known.has(upper as NewsCategory) ? (upper as NewsCategory) : 'INSURANCE'
}

function rowToNewsItem(row: PrismaNewsRow): NewsItem {
  const country = /australia|apra|asic|rba|treasury/i.test(`${row.title} ${row.summary} ${row.source}`)
    ? 'AUSTRALIA'
    : 'INTERNATIONAL'

  return {
    id: row.id,
    clusterKey: row.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).slice(0, 8).join('-'),
    title: row.title,
    summary: row.summary || '',
    category: asNewsCategory(row.category),
    subcategories: [],
    country,
    jurisdictions: [],
    practiceAreas: [],
    actuarialConcepts: [],
    sourceName: row.source,
    sourceType: 'NEWS',
    sourceTier: 3,
    sourceUrl: row.url,
    url: row.url,
    publishedAt: row.publishedDate ? row.publishedDate.toISOString() : null,
    discoveredAt: row.publishedDate ? row.publishedDate.toISOString() : new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
    sourceUpdatedAt: null,
    importance: 'NORMAL',
    whyItMatters: row.relevance || 'Stored production backup story for actuarial awareness.',
    supportingSources: [],
    confidence: 0.5
  }
}

export async function upsertPrismaBackupNews(input: {
  title: string
  source: string
  publishedDate: string | null
  summary: string
  url: string
  category: NewsCategory
  relevance?: string
}) {
  const prisma = await getPrismaClient()
  if (!prisma) return

  const publishedDate = input.publishedDate ? new Date(input.publishedDate) : new Date()

  await prisma.actuarialNewsItem.upsert({
    where: { url: input.url },
    update: {
      title: input.title,
      source: input.source,
      publishedDate,
      summary: input.summary,
      category: input.category,
      relevance: input.relevance || null
    },
    create: {
      title: input.title,
      source: input.source,
      publishedDate,
      summary: input.summary,
      url: input.url,
      category: input.category,
      relevance: input.relevance || null
    }
  })
}

export async function queryPrismaBackupNews(filters: NewsQueryFilters): Promise<NewsItem[]> {
  const prisma = await getPrismaClient()
  if (!prisma) return []

  const where: Record<string, unknown> = {}
  if (filters.category && filters.category !== 'All') {
    where.category = filters.category
  }

  const rows = await prisma.actuarialNewsItem.findMany({
    where,
    orderBy: { publishedDate: 'desc' },
    take: Math.max(1, Math.min(filters.limit || 60, 200))
  }) as PrismaNewsRow[]

  return rows.map(rowToNewsItem)
}
