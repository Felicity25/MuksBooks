// Shared helpers for resolving real, external job links and career metadata.
// Used by both the local SQLite service and the Supabase cloud service so the
// "which URL do we show the user" and "is this still an active opportunity"
// logic behaves identically regardless of which persistence layer is active.

export const CAREER_AREAS = [
  'Recommended for Actuarial Students',
  'Actuarial',
  'Insurance',
  'Risk',
  'Investments',
  'Banking',
  'Quant Finance',
  'Trading',
  'Data & Analytics',
  'Consulting',
  'Superannuation',
  'Finance',
  'Economics',
  'Technology / FinTech',
  'Government / Regulation',
  'All Quantitative Careers'
] as const
export type CareerArea = typeof CAREER_AREAS[number]

export type OpportunityStatus =
  | 'CURRENTLY_LISTED'
  | 'LIKELY_OPEN'
  | 'CLOSING_SOON'
  | 'CLOSED_OR_EXPIRED'
  | 'LISTING_UNAVAILABLE'
  | 'STALE_UNVERIFIED'

interface CareerFamilyRule {
  family: string
  terms: string[]
}

const CAREER_FAMILY_RULES: CareerFamilyRule[] = [
  { family: 'Actuarial', terms: ['actuarial', 'pricing', 'reserving', 'valuation', 'capital modelling', 'experience analysis', 'reinsurance', 'pensions', 'superannuation'] },
  { family: 'Insurance', terms: ['insurance', 'underwriting', 'claims', 'catastrophe', 'exposure management', 'portfolio analyst'] },
  { family: 'Risk', terms: ['risk', 'stress testing', 'credit risk', 'market risk', 'operational risk', 'model risk', 'esg risk', 'climate risk'] },
  { family: 'Investments', terms: ['investment', 'asset allocation', 'portfolio analytics', 'asset-liability', 'wealth management', 'funds management'] },
  { family: 'Banking', terms: ['banking', 'treasury', 'credit', 'institutional banking', 'corporate banking', 'investment banking', 'markets'] },
  { family: 'Quant Finance', terms: ['quantitative analyst', 'quantitative research', 'financial engineering', 'quant strategist', 'derivatives', 'risk quant'] },
  { family: 'Trading', terms: ['trading', 'trader', 'market maker', 'systematic trading', 'quantitative trading'] },
  { family: 'Data & Analytics', terms: ['data analyst', 'analytics', 'decision scientist', 'forecasting', 'predictive modelling', 'statistical analyst', 'econometrics'] },
  { family: 'Consulting', terms: ['consulting', 'advisory', 'transaction advisory', 'strategy', 'transformation'] },
  { family: 'Superannuation', terms: ['superannuation', 'retirement', 'defined benefits', 'member analytics', 'retirement income'] },
  { family: 'Finance', terms: ['finance', 'financial modelling', 'financial analysis', 'corporate finance'] },
  { family: 'Economics', terms: ['economics', 'economic analyst', 'economic consulting', 'policy modelling', 'econometric'] },
  { family: 'Technology / FinTech', terms: ['fintech', 'insurtech', 'risk technology', 'product analytics', 'data platform', 'ai/ml'] },
  { family: 'Government / Regulation', terms: ['government', 'regulator', 'regulation', 'public policy', 'central bank'] }
]

const STRONG_SIGNAL_TERMS = [
  'actuarial',
  'statistics',
  'probability',
  'quantitative',
  'modelling',
  'risk',
  'finance',
  'econometrics',
  'python',
  'r',
  'sql',
  'excel'
]

const WEAK_SIGNAL_TERMS = [
  'analysis',
  'analyst',
  'forecast',
  'data',
  'commercial',
  'portfolio',
  'pricing',
  'valuation',
  'research'
]

const IRRELEVANT_TERMS = [
  'graphic design',
  'nursing',
  'hr coordinator',
  'talent acquisition',
  'social media manager',
  'retail sales assistant',
  'hairdresser'
]

function isHttpUrl(value?: string | null): value is string {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isPlaceholderUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return hostname === 'example.com' || hostname.endsWith('.example.com')
  } catch {
    return true
  }
}

/**
 * Resolves the best available external URL for a job opportunity.
 * Priority: 1) direct job listing URL, 2) source listing URL, 3) official
 * employer careers page. Placeholder/invalid URLs (e.g. example.com) are
 * rejected at every step. Returns null if no valid URL is available.
 */
export function resolveJobApplicationUrl(input: {
  applicationUrl?: string | null
  sourceUrl?: string | null
  officialCareersUrl?: string | null
}): string | null {
  const candidates = [input.applicationUrl, input.sourceUrl, input.officialCareersUrl]
  for (const candidate of candidates) {
    if (isHttpUrl(candidate) && !isPlaceholderUrl(candidate)) return candidate
  }
  return null
}

export function matchesFilterValue(value: string | null | undefined, selected: string[]) {
  if (!selected.length) return true
  const normalized = (value || '').toLowerCase()
  if (!normalized) return false
  return selected.some((item) => {
    const candidate = item.toLowerCase().trim()
    return normalized.includes(candidate) || candidate.includes(normalized)
  })
}

export function inferCareerFamilies(input: {
  title?: string | null
  description?: string | null
  requirements?: string | null
  discipline?: string | null
  careerArea?: string | null
}) {
  const source = [
    input.title,
    input.description,
    input.requirements,
    input.discipline,
    input.careerArea
  ].filter(Boolean).join(' ').toLowerCase()

  const families = new Set<string>()
  for (const rule of CAREER_FAMILY_RULES) {
    if (rule.terms.some((term) => source.includes(term))) {
      families.add(rule.family)
    }
  }

  if (!families.size && input.careerArea) {
    families.add(input.careerArea)
  }

  return Array.from(families)
}

export function getActuarialCareerFit(input: {
  title?: string | null
  description?: string | null
  requirements?: string | null
  discipline?: string | null
  careerArea?: string | null
}) {
  const source = [
    input.title,
    input.description,
    input.requirements,
    input.discipline,
    input.careerArea
  ].filter(Boolean).join(' ').toLowerCase()

  const families = inferCareerFamilies(input)

  if (IRRELEVANT_TERMS.some((term) => source.includes(term))) {
    return {
      score: 20,
      label: 'Low relevance',
      reason: 'This role appears outside actuarial/quantitative pathways.',
      families,
      isRelevant: false
    }
  }

  let score = 50
  for (const term of STRONG_SIGNAL_TERMS) {
    if (source.includes(term)) score += 5
  }
  for (const term of WEAK_SIGNAL_TERMS) {
    if (source.includes(term)) score += 2
  }

  if (source.includes('actuarial analyst') || source.includes('graduate actuary')) {
    score += 20
  }

  score += Math.min(15, families.length * 3)
  score = Math.max(0, Math.min(99, score))

  let label = 'Relevant adjacent opportunity'
  if (score >= 90) label = 'Direct actuarial relevance'
  else if (score >= 80) label = 'Highly relevant'
  else if (score >= 70) label = 'Recommended for actuarial students'

  const topFamilies = families.slice(0, 3)
  const reason = topFamilies.length
    ? `Strong overlap with ${topFamilies.join(', ')} skills used in actuarial pathways.`
    : 'This role includes quantitative and analytical signals aligned with actuarial-adjacent pathways.'

  return {
    score,
    label,
    reason,
    families,
    isRelevant: score >= 60
  }
}

export function getOpportunityStatus(input: {
  closingDate?: string | null
  applicationUrl?: string | null
  lastVerified?: string | null
  sourceType?: string | null
}) {
  if (!input.applicationUrl) {
    return {
      status: 'LISTING_UNAVAILABLE' as OpportunityStatus,
      label: 'Listing unavailable'
    }
  }

  if (isJobListingExpired(input.closingDate)) {
    return {
      status: 'CLOSED_OR_EXPIRED' as OpportunityStatus,
      label: 'Closed'
    }
  }

  if (input.closingDate) {
    const closing = new Date(input.closingDate)
    if (!Number.isNaN(closing.getTime())) {
      const diffMs = closing.getTime() - Date.now()
      if (diffMs > 0 && diffMs <= 1000 * 60 * 60 * 24 * 7) {
        return {
          status: 'CLOSING_SOON' as OpportunityStatus,
          label: `Closes ${closing.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`
        }
      }
    }
  }

  const sourceType = (input.sourceType || '').toUpperCase()

  if (input.lastVerified) {
    const verifiedAt = new Date(input.lastVerified)
    if (!Number.isNaN(verifiedAt.getTime())) {
      const staleMs = Date.now() - verifiedAt.getTime()
      if (staleMs > 1000 * 60 * 60 * 24 * 30) {
        return {
          status: 'STALE_UNVERIFIED' as OpportunityStatus,
          label: 'Unable to verify current status'
        }
      }

      if (sourceType.includes('OFFICIAL')) {
        return {
          status: 'CURRENTLY_LISTED' as OpportunityStatus,
          label: 'Currently listed'
        }
      }

      return {
        status: 'LIKELY_OPEN' as OpportunityStatus,
        label: 'Likely open'
      }
    }
  }

  return {
    status: 'LIKELY_OPEN' as OpportunityStatus,
    label: 'Likely open'
  }
}

export function isHiddenGemCompany(input: {
  sourceType?: string | null
  activeJobCount?: number
  averageCareerFit?: number
  careerFamilyCount?: number
}) {
  const sourceType = (input.sourceType || '').toUpperCase()
  const activeJobCount = Number(input.activeJobCount || 0)
  const averageCareerFit = Number(input.averageCareerFit || 0)
  const familyCount = Number(input.careerFamilyCount || 0)
  const smallFootprint = activeJobCount <= 3
  const societySeeded = sourceType.includes('SOCIETY_SEED')

  // Dynamic rule: strong relevance + smaller visibility + meaningful domain breadth.
  return (smallFootprint && averageCareerFit >= 72 && familyCount >= 1) || (societySeeded && averageCareerFit >= 68)
}

/**
 * Returns true when a job's closing date has already passed, meaning it
 * should no longer be presented as an active opportunity.
 */
export function isJobListingExpired(closingDate?: string | null): boolean {
  if (!closingDate) return false
  const date = new Date(closingDate)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() < Date.now()
}
