import type { UniversityApplication } from './types'

const SHORTLIST_KEY = 'muksbooks:universities:shortlist:v2'
const COMPARE_KEY = 'muksbooks:universities:compare:v1'
const APPLICATIONS_KEY = 'muksbooks:universities:applications:v1'

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
  getShortlist: () => readJson<string[]>(SHORTLIST_KEY, []),
  saveShortlist: (ids: string[]) => writeJson(SHORTLIST_KEY, Array.from(new Set(ids))),
  getCompare: () => readJson<string[]>(COMPARE_KEY, []),
  saveCompare: (ids: string[]) => writeJson(COMPARE_KEY, Array.from(new Set(ids)).slice(0, 4)),
  getApplications: () => readJson<UniversityApplication[]>(APPLICATIONS_KEY, []),
  saveApplications: (applications: UniversityApplication[]) => writeJson(APPLICATIONS_KEY, applications)
}

export function createApplication(programmeId: string, institutionId: string): UniversityApplication {
  const now = new Date().toISOString()
  return { id: `${programmeId}-${Date.now()}`, programmeId, institutionId, status: 'Interested', notes: '', tasks: [], createdAt: now, updatedAt: now }
}
