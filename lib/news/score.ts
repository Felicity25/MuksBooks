import type { NewsItem } from './types'

const TIER_SCORE: Record<number, number> = { 1: 40, 2: 25, 3: 15, 4: 5 }
const IMPORTANCE_SCORE: Record<string, number> = { MAJOR: 50, IMPORTANT: 25, NORMAL: 0 }

function recencyScore(publishedAt: string | null): number {
  if (!publishedAt) return 0
  const ageMs = Date.now() - new Date(publishedAt).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  if (ageDays < 0) return 40
  return Math.max(0, 40 - ageDays * 6)
}

export interface ScoreContext {
  interestKeywords?: string[]
}

export function scoreNewsItem(item: NewsItem, ctx: ScoreContext = {}): number {
  let score = recencyScore(item.publishedAt) + (TIER_SCORE[item.sourceTier] || 0) + (IMPORTANCE_SCORE[item.importance] || 0)

  if (item.country === 'AUSTRALIA') score += 20

  if (item.sourceUpdatedAt && item.sourceUpdatedAt !== item.discoveredAt) score += 10

  if (ctx.interestKeywords?.length) {
    const haystack = [...item.actuarialConcepts, ...item.practiceAreas, item.title].join(' ').toLowerCase()
    const matched = ctx.interestKeywords.some((kw) => haystack.includes(kw.toLowerCase()))
    if (matched) score += 15
  }

  return score
}
