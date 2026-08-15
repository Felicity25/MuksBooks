export type NewsCategory =
  | 'INSURANCE'
  | 'RISK_MANAGEMENT'
  | 'FINANCIAL_MARKETS'
  | 'AI'
  | 'REGULATION'
  | 'SUPERANNUATION_PENSIONS'
  | 'CLIMATE_RISK'
  | 'CAREERS'
  | 'RESEARCH'

export type NewsCountry = 'AUSTRALIA' | 'SOUTH_AFRICA' | 'INTERNATIONAL'

export type SourceType = 'REGULATOR' | 'GOVERNMENT' | 'PROFESSIONAL_BODY' | 'ACADEMIC' | 'COMPANY' | 'NEWS' | 'INDUSTRY'

export type NewsImportance = 'NORMAL' | 'IMPORTANT' | 'MAJOR'

export type RegulatoryStatus = 'CONSULTATION' | 'RELEASED' | 'UNKNOWN'

export type ResearchDifficulty = 'ACCESSIBLE' | 'INTERMEDIATE' | 'TECHNICAL'

export interface NewsSource {
  id: string
  name: string
  feedUrl: string
  feedFormat: 'rss' | 'atom'
  sourceType: SourceType
  tier: 1 | 2 | 3 | 4
  country: NewsCountry
  jurisdictions?: string[]
  defaultCategory?: NewsCategory
  cadence: 'high' | 'medium' | 'daily'
}

export interface SupportingSource {
  name: string
  url: string
}

export interface NewsItem {
  id: string
  clusterKey: string
  title: string
  summary: string
  category: NewsCategory
  subcategories: string[]
  country: NewsCountry
  jurisdictions: string[]
  practiceAreas: string[]
  actuarialConcepts: string[]
  sourceName: string
  sourceType: SourceType
  sourceTier: 1 | 2 | 3 | 4
  sourceUrl: string
  url: string
  publishedAt: string | null
  discoveredAt: string
  lastCheckedAt: string
  sourceUpdatedAt: string | null
  importance: NewsImportance
  whyItMatters: string
  actuarialImpact?: string
  affectedGroups?: string[]
  effectiveDate?: string
  consultationCloseDate?: string
  status?: RegulatoryStatus
  researchAuthors?: string[]
  researchInstitution?: string
  researchQuestion?: string
  researchKeyFinding?: string
  researchDifficulty?: ResearchDifficulty
  relatedCompanies?: string[]
  relatedRegulators?: string[]
  supportingSources: SupportingSource[]
  confidence: number
}

export interface NewsQueryFilters {
  category?: NewsCategory | 'All'
  country?: NewsCountry
  range?: 'today' | '7d' | '30d'
  from?: string
  to?: string
  q?: string
  concept?: string
  practiceArea?: string
  savedOnly?: boolean
  userId?: string
  limit?: number
}

export interface BriefItem {
  id: string
  title: string
  summary: string
  category: NewsCategory
}
