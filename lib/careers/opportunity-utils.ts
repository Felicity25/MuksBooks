// Shared helpers for resolving real, external job links and career-area metadata.
// Used by both the local SQLite service and the Supabase cloud service so the
// "which URL do we show the user" and "is this still an active opportunity"
// logic behaves identically regardless of which persistence layer is active.

export const CAREER_AREAS = ['Actuarial', 'Banking', 'Technology'] as const
export type CareerArea = typeof CAREER_AREAS[number]

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
