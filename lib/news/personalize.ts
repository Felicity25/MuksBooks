import { getDb } from '../app-state/db.ts'

/** Lightweight, non-fabricated personalization: derives interest keywords from the student's own course names. */
export function getInterestKeywords(userId = 'default'): string[] {
  try {
    const db = getDb()
    const rows = db
      .prepare('SELECT course_code, course_name FROM courses WHERE status IS NULL OR status != ?')
      .all('archived') as Array<{ course_code: string; course_name: string | null }>

    const keywords = new Set<string>()
    for (const row of rows) {
      const name = (row.course_name || '').toLowerCase()
      for (const term of ['risk', 'insurance', 'survival', 'glm', 'financial', 'reinsurance', 'mortality', 'investment', 'pension', 'superannuation', 'claims', 'actuarial']) {
        if (name.includes(term)) keywords.add(term)
      }
    }
    return Array.from(keywords)
  } catch {
    return []
  }
}

export function getRelatedCourseCode(userId = 'default', concepts: string[], practiceAreas: string[]): string | undefined {
  try {
    const db = getDb()
    const rows = db
      .prepare('SELECT course_code, course_name FROM courses WHERE status IS NULL OR status != ?')
      .all('archived') as Array<{ course_code: string; course_name: string | null }>

    const haystack = [...concepts, ...practiceAreas].join(' ').toLowerCase()
    if (!haystack) return undefined

    for (const row of rows) {
      const name = (row.course_name || '').toLowerCase()
      if (!name) continue
      const nameTerms = name.split(/\W+/).filter((t) => t.length > 3)
      if (nameTerms.some((term) => haystack.includes(term))) {
        return row.course_code
      }
    }
    return undefined
  } catch {
    return undefined
  }
}
