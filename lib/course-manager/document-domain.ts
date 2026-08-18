export type DocumentDomain = 'academic' | 'career' | 'personal' | 'other'

export function isAcademicUnitBinding(domain: DocumentDomain, code?: string | null) {
  const normalized = code?.trim().toUpperCase() || ''
  return domain === 'academic' && Boolean(normalized) && normalized !== 'UNCLASSIFIED' && normalized !== 'CV'
}