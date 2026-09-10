import type { FundingApplication, UniversityApplication } from './types'
import { createUniversityApplication, normalizeUniversityApplication } from './application-domain.ts'
import { normalizeFundingApplication } from './funding-domain.ts'

const SHORTLIST_KEY = 'muksbooks:universities:shortlist:v2'
const COMPARE_KEY = 'muksbooks:universities:compare:v1'
const APPLICATIONS_KEY = 'muksbooks:universities:applications:v1'
const FUNDING_SAVED_KEY = 'muksbooks:universities:funding-saved:v1'
const FUNDING_APPLICATIONS_KEY = 'muksbooks:universities:funding-applications:v1'
const FUNDING_CONTRIBUTIONS_KEY = 'muksbooks:universities:funding-contributions:v1'

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? 'null')
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value))
}

export const universityStorage = {
  getShortlist: () => { const value = readJson<unknown>(SHORTLIST_KEY, []); return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [] },
  saveShortlist: (ids: string[]) => writeJson(SHORTLIST_KEY, Array.from(new Set(ids))),
  getCompare: () => { const value = readJson<unknown>(COMPARE_KEY, []); return Array.isArray(value) ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string'))) : [] },
  saveCompare: (ids: string[]) => writeJson(COMPARE_KEY, Array.from(new Set(ids))),
  getApplications: () => { const value = readJson<unknown>(APPLICATIONS_KEY, []); return Array.isArray(value) ? value.filter((item): item is Partial<UniversityApplication> & Record<string, unknown> => Boolean(item && typeof item === 'object')).map(normalizeUniversityApplication) : [] },
  saveApplications: (applications: UniversityApplication[]) => writeJson(APPLICATIONS_KEY, applications),
  getFundingSaved: () => { const value = readJson<unknown>(FUNDING_SAVED_KEY, []); return Array.isArray(value) ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string'))) : [] },
  saveFundingSaved: (ids: string[]) => writeJson(FUNDING_SAVED_KEY, Array.from(new Set(ids))),
  getFundingApplications: () => { const value = readJson<unknown>(FUNDING_APPLICATIONS_KEY, []); return Array.isArray(value) ? value.filter((item): item is Partial<FundingApplication> & Record<string, unknown> => Boolean(item && typeof item === 'object')).map(normalizeFundingApplication) : [] },
  saveFundingApplications: (applications: FundingApplication[]) => writeJson(FUNDING_APPLICATIONS_KEY, applications),
  getFundingContributions: () => { const value = readJson<unknown>(FUNDING_CONTRIBUTIONS_KEY, {}); return value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0)) : {} },
  saveFundingContributions: (contributions: Record<string, number>) => writeJson(FUNDING_CONTRIBUTIONS_KEY, contributions)
}

export function createApplication(programmeId: string, institutionId: string): UniversityApplication {
  return createUniversityApplication(programmeId, institutionId)
}
