import type { NewsCategory, NewsCountry, NewsImportance, NewsSource, RegulatoryStatus } from './types'

function textOf(title: string, summary: string) {
  return `${title} ${summary}`.toLowerCase()
}

function countMatches(text: string, keywords: string[]) {
  return keywords.reduce((count, kw) => (text.includes(kw) ? count + 1 : count), 0)
}

const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  REGULATION: [
    'apra', 'asic', 'prudential standard', 'cps ', 'sps ', 'consultation paper', 'discussion paper',
    'exposure draft', 'regulatory guidance', 'capital requirement', 'reporting standard', 'governance requirement',
    'treasury', 'legislation', 'reform bill', 'enforcement action', 'licence condition'
  ],
  SUPERANNUATION_PENSIONS: [
    'superannuation', 'super fund', 'pension', 'retirement income', 'defined benefit', 'defined contribution',
    'preservation age', 'contribution cap', 'your future your super', 'performance test', 'retirement income covenant',
    'annuit', 'drawdown', 'longevity risk', 'super guarantee', 'sequencing risk', 'retirement adequacy'
  ],
  CLIMATE_RISK: [
    'bushfire', 'flood', 'cyclone', 'drought', 'heatwave', 'catastrophe', 'natural disaster', 'climate risk',
    'climate change', 'carbon', 'transition risk', 'stranded asset', 'reinsurance capacity', 'insured loss',
    'climate disclosure', 'resilience', 'adaptation'
  ],
  AI: [
    'artificial intelligence', 'machine learning', 'generative ai', 'large language model', 'llm', 'gpt',
    'ai model', 'ai agent', 'algorithm', 'automated underwriting', 'ai governance', 'model explainability',
    'ai regulation', 'ai risk', 'data governance'
  ],
  RISK_MANAGEMENT: [
    'enterprise risk', 'operational risk', 'credit risk', 'market risk', 'liquidity risk', 'cyber risk',
    'geopolitical risk', 'supply chain', 'pandemic risk', 'model risk', 'conduct risk', 'systemic risk',
    'risk management'
  ],
  FINANCIAL_MARKETS: [
    'interest rate', 'bond yield', 'yield curve', 'inflation', 'equity market', 'credit spread', 'currency',
    'property market', 'commodity price', 'central bank', 'cash rate', 'volatility', 'asx', 'share market'
  ],
  INSURANCE: [
    'insurer', 'insurance', 'reinsurance', 'premium', 'claims', 'underwriting', 'combined ratio', 'loss ratio',
    'policyholder', 'life insurance', 'health insurance', 'general insurance', 'reserving', 'solvency'
  ],
  CAREERS: [
    'graduate program', 'graduate role', 'internship', 'hiring', 'job market', 'salary survey', 'actuarial exam',
    'career', 'recruitment', 'vacancy', 'employment trend'
  ],
  RESEARCH: [
    'research paper', 'working paper', 'journal', 'arxiv', 'study finds', 'academic study', 'ssrn', 'preprint',
    'research question', 'empirical study'
  ]
}

const PRACTICE_AREA_KEYWORDS: Record<string, string[]> = {
  'General Insurance': ['general insurance', 'home insurance', 'motor insurance', 'property insurance', 'catastrophe'],
  'Life Insurance': ['life insurance', 'mortality', 'term insurance', 'income protection'],
  Health: ['health insurance', 'private health', 'health fund'],
  Superannuation: ['superannuation', 'super fund', 'retirement income', 'pension'],
  Investments: ['investment', 'asset allocation', 'portfolio', 'equity market', 'bond yield'],
  Banking: ['bank', 'abs', 'credit', 'lending'],
  Risk: ['risk management', 'risk model', 'operational risk', 'enterprise risk'],
  'Data Science': ['machine learning', 'artificial intelligence', 'data science', 'predictive model'],
  Reinsurance: ['reinsurance', 'retrocession', 'excess-of-loss'],
  Consulting: ['consulting', 'advisory']
}

const ACTUARIAL_CONCEPT_KEYWORDS: Record<string, string[]> = {
  Pricing: ['pricing', 'premium rate', 'rate filing'],
  Reserving: ['reserving', 'reserve', 'claims reserve'],
  Capital: ['capital requirement', 'capital adequacy', 'solvency capital'],
  Mortality: ['mortality'],
  Longevity: ['longevity'],
  Reinsurance: ['reinsurance', 'retrocession'],
  ALM: ['asset-liability', 'asset liability matching', 'alm'],
  'Risk Management': ['risk management', 'enterprise risk'],
  Investment: ['investment', 'asset allocation'],
  Superannuation: ['superannuation', 'super fund'],
  'Climate Modelling': ['catastrophe model', 'climate scenario', 'climate model'],
  'Machine Learning': ['machine learning', 'artificial intelligence', 'generative ai'],
  Regulation: ['prudential standard', 'regulatory', 'consultation paper'],
  Claims: ['claims'],
  Solvency: ['solvency']
}

const JURISDICTION_KEYWORDS: Record<string, string[]> = {
  'United Kingdom': ['united kingdom', ' uk ', 'britain', 'pra ', 'fca '],
  'United States': ['united states', ' u.s.', 'naic', 'usa'],
  Canada: ['canada', 'osfi'],
  Europe: ['european union', 'eu ', 'solvency ii', 'eiopa'],
  'New Zealand': ['new zealand', 'rbnz'],
  'Asia-Pacific': ['asia-pacific', 'singapore', 'hong kong', 'japan', 'china'],
  'South Africa': ['south africa', 'fsca', 'sarb']
}

const MAJOR_SIGNALS = [
  'consultation paper', 'discussion paper', 'capital requirement', 'reform', 'cash rate decision',
  'new prudential standard', 'billion', 'performance test', 'reserving requirement', 'regulatory review'
]

const IMPORTANT_SIGNALS = [
  'result', 'earnings', 'combined ratio', 'catastrophe', 'consultation', 'guidance', 'research finds', 'reports'
]

function scoreCategories(text: string): Array<[NewsCategory, number]> {
  return (Object.keys(CATEGORY_KEYWORDS) as NewsCategory[]).map((category) => [
    category,
    countMatches(text, CATEGORY_KEYWORDS[category])
  ])
}

const CAREER_POSITIVE_SIGNALS = [
  'internship', 'vacation program', 'graduate role', 'graduate program', 'analyst role',
  'actuarial analyst', 'job opening', 'job posting', 'vacancy', 'hiring', 'apply now',
  'application closes', 'applications close', 'position available', 'entry level', 'entry-level'
]

const CAREER_EVENT_SIGNALS = [
  'seminar', 'webinar', 'forum', 'conference', 'workshop', 'session', 'leadership transition',
  'call for volunteers', 'practitioners forum', 'event'
]

export function isLikelyCareerOpportunity(title: string, summary: string): boolean {
  const text = textOf(title, summary)
  const positiveHits = countMatches(text, CAREER_POSITIVE_SIGNALS)
  const eventHits = countMatches(text, CAREER_EVENT_SIGNALS)
  if (positiveHits === 0) return false
  return positiveHits > eventHits
}

export function classifyCategory(title: string, summary: string, source: NewsSource): NewsCategory {
  const text = textOf(title, summary)
  const scored = scoreCategories(text).sort((a, b) => b[1] - a[1])

  if (scored[0][1] > 0) {
    const topCategory = scored[0][0]
    if (topCategory === 'CAREERS' && !isLikelyCareerOpportunity(title, summary)) {
      const nextNonCareers = scored.find(([category, score]) => category !== 'CAREERS' && score > 0)
      if (nextNonCareers) return nextNonCareers[0]
    } else {
      return topCategory
    }
  }

  if (source.defaultCategory === 'CAREERS' && !isLikelyCareerOpportunity(title, summary)) {
    return 'RISK_MANAGEMENT'
  }

  return source.defaultCategory || 'INSURANCE'
}

export function classifyPracticeAreas(title: string, summary: string): string[] {
  const text = textOf(title, summary)
  return Object.entries(PRACTICE_AREA_KEYWORDS)
    .filter(([, keywords]) => countMatches(text, keywords) > 0)
    .map(([area]) => area)
}

export function classifyActuarialConcepts(title: string, summary: string): string[] {
  const text = textOf(title, summary)
  return Object.entries(ACTUARIAL_CONCEPT_KEYWORDS)
    .filter(([, keywords]) => countMatches(text, keywords) > 0)
    .map(([concept]) => concept)
}

export function classifyJurisdictions(title: string, summary: string): string[] {
  const text = textOf(title, summary)
  return Object.entries(JURISDICTION_KEYWORDS)
    .filter(([, keywords]) => countMatches(text, keywords) > 0)
    .map(([jurisdiction]) => jurisdiction)
}

export function classifyCountry(title: string, summary: string, source: NewsSource): NewsCountry {
  const text = textOf(title, summary)
  if (text.includes('south africa') || text.includes('fsca') || text.includes('sarb')) return 'SOUTH_AFRICA'
  if (source.country === 'AUSTRALIA') return 'AUSTRALIA'
  const auSignals = ['australia', 'apra', 'asic', '.com.au', '.gov.au', 'asx', 'melbourne', 'sydney']
  if (countMatches(text, auSignals) > 0) return 'AUSTRALIA'
  return 'INTERNATIONAL'
}

export function classifyImportance(title: string, summary: string, source: NewsSource): NewsImportance {
  const text = textOf(title, summary)
  const majorHits = countMatches(text, MAJOR_SIGNALS)
  const importantHits = countMatches(text, IMPORTANT_SIGNALS)
  if (majorHits > 0 && source.tier <= 2) return 'MAJOR'
  if (majorHits > 0 || (importantHits > 0 && source.tier === 1)) return 'IMPORTANT'
  if (importantHits > 0) return 'IMPORTANT'
  return 'NORMAL'
}

export function classifyRegulatoryStatus(title: string, summary: string): RegulatoryStatus | undefined {
  const text = textOf(title, summary)
  if (/consultation|discussion paper|exposure draft|comments? due|submissions? close/.test(text)) return 'CONSULTATION'
  if (/prudential standard|final standard|effective from|comes into effect/.test(text)) return 'RELEASED'
  return undefined
}

const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'
const DATE_RE = new RegExp(`\\b(\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4})\\b`, 'i')

export function extractEffectiveDate(title: string, summary: string): string | undefined {
  const text = `${title} ${summary}`
  const match = text.match(new RegExp(`(?:effective|from|commencing)\\s+(?:from\\s+)?${DATE_RE.source}`, 'i'))
  return match?.[1]
}

export function extractConsultationCloseDate(title: string, summary: string): string | undefined {
  const text = `${title} ${summary}`
  const match = text.match(new RegExp(`(?:submissions? clos\\w*|comments? due|consultation clos\\w*)\\s+(?:by\\s+|on\\s+)?${DATE_RE.source}`, 'i'))
  return match?.[1]
}
