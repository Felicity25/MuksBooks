import type { NewsSource } from './types'

/**
 * Source registry with a quality tier (1 = primary/authoritative .. 4 = aggregator).
 * All feed URLs below were verified reachable before being added. If a regulator
 * or body has no public feed (e.g. ASIC, Actuaries Institute at time of writing),
 * it is intentionally left out rather than guessing a URL.
 */
export const NEWS_SOURCES: NewsSource[] = [
  // Tier 1 — regulators & government (Australia)
  {
    id: 'apra',
    name: 'APRA',
    feedUrl: 'https://www.apra.gov.au/rss.xml',
    feedFormat: 'rss',
    sourceType: 'REGULATOR',
    tier: 1,
    country: 'AUSTRALIA',
    defaultCategory: 'REGULATION',
    cadence: 'medium'
  },
  {
    id: 'treasury-au',
    name: 'Australian Treasury',
    feedUrl: 'https://treasury.gov.au/rss.xml',
    feedFormat: 'rss',
    sourceType: 'GOVERNMENT',
    tier: 1,
    country: 'AUSTRALIA',
    defaultCategory: 'REGULATION',
    cadence: 'medium'
  },
  {
    id: 'rba',
    name: 'Reserve Bank of Australia',
    feedUrl: 'https://www.rba.gov.au/rss/rss-cb-media-releases.xml',
    feedFormat: 'rss',
    sourceType: 'GOVERNMENT',
    tier: 1,
    country: 'AUSTRALIA',
    defaultCategory: 'FINANCIAL_MARKETS',
    cadence: 'high'
  },
  {
    id: 'asfa',
    name: 'ASFA (Australia)',
    feedUrl: 'https://www.superannuation.asn.au/feed/',
    feedFormat: 'rss',
    sourceType: 'PROFESSIONAL_BODY',
    tier: 1,
    country: 'AUSTRALIA',
    defaultCategory: 'SUPERANNUATION_PENSIONS',
    cadence: 'daily'
  },

  // Tier 2/3 — actuarial bodies & industry press
  {
    id: 'the-actuary-newsroom',
    name: 'The Actuary - Newsroom',
    feedUrl: 'https://actuary.org/feed/newsroom-rss/',
    feedFormat: 'rss',
    sourceType: 'PROFESSIONAL_BODY',
    tier: 2,
    country: 'INTERNATIONAL',
    cadence: 'daily'
  },
  {
    id: 'the-actuary-resources',
    name: 'The Actuary - Resources',
    feedUrl: 'https://actuary.org/feed/resources-rss/',
    feedFormat: 'rss',
    sourceType: 'PROFESSIONAL_BODY',
    tier: 2,
    country: 'INTERNATIONAL',
    cadence: 'daily'
  },
  {
    id: 'the-actuary-events',
    name: 'The Actuary - Events',
    feedUrl: 'https://actuary.org/feed/events-rss/',
    feedFormat: 'rss',
    sourceType: 'PROFESSIONAL_BODY',
    tier: 3,
    country: 'INTERNATIONAL',
    cadence: 'daily'
  },
  {
    id: 'actuarial-eye',
    name: 'Actuarial Eye (Australia)',
    feedUrl: 'https://actuarialeye.com/feed/',
    feedFormat: 'rss',
    sourceType: 'INDUSTRY',
    tier: 3,
    country: 'AUSTRALIA',
    cadence: 'daily'
  },
  {
    id: 'insurance-business-au',
    name: 'Insurance Business Australia',
    feedUrl: 'https://www.insurancebusinessmag.com/au/rss',
    feedFormat: 'rss',
    sourceType: 'NEWS',
    tier: 3,
    country: 'AUSTRALIA',
    defaultCategory: 'INSURANCE',
    cadence: 'high'
  },
  {
    id: 'insurance-journal',
    name: 'Insurance Journal',
    feedUrl: 'https://www.insurancejournal.com/feed/',
    feedFormat: 'rss',
    sourceType: 'NEWS',
    tier: 3,
    country: 'INTERNATIONAL',
    defaultCategory: 'INSURANCE',
    cadence: 'high'
  },
  {
    id: 'risk-net',
    name: 'Risk.net',
    feedUrl: 'https://www.risk.net/feeds/rss',
    feedFormat: 'rss',
    sourceType: 'NEWS',
    tier: 3,
    country: 'INTERNATIONAL',
    defaultCategory: 'RISK_MANAGEMENT',
    cadence: 'high'
  },

  // Tier 1 — academic research (arXiv quantitative finance categories)
  {
    id: 'arxiv-qfin-rm',
    name: 'arXiv q-fin.RM (Risk Management)',
    feedUrl: 'https://export.arxiv.org/api/query?search_query=cat:q-fin.RM&sortBy=submittedDate&sortOrder=descending&max_results=15',
    feedFormat: 'atom',
    sourceType: 'ACADEMIC',
    tier: 1,
    country: 'INTERNATIONAL',
    defaultCategory: 'RESEARCH',
    cadence: 'daily'
  },
  {
    id: 'arxiv-qfin-pr',
    name: 'arXiv q-fin.PR (Pricing of Securities)',
    feedUrl: 'https://export.arxiv.org/api/query?search_query=cat:q-fin.PR&sortBy=submittedDate&sortOrder=descending&max_results=15',
    feedFormat: 'atom',
    sourceType: 'ACADEMIC',
    tier: 1,
    country: 'INTERNATIONAL',
    defaultCategory: 'RESEARCH',
    cadence: 'daily'
  }
]

/** Known regulators/bodies with no working public feed at time of writing — not wired in to avoid fabricated URLs. */
export const KNOWN_GAPS = ['ASIC', 'Actuaries Institute Australia', 'actuaries.digital']
