import { createHash } from 'node:crypto'
import { CURRICULUM_RESOURCES } from './curriculum-resources.ts'

export type CurriculumSourceCheckStatus = 'ACTIVE' | 'NEEDS_REVIEW' | 'BROKEN'

export interface TrustedCurriculumSource {
  id: string
  url: string
  authority: string
  expectedDomain: string
  previousFingerprint?: string
}

export interface CurriculumSourceCheck {
  sourceId: string
  sourceUrl: string
  finalUrl?: string
  checkedAt: string
  httpStatus?: number
  status: CurriculumSourceCheckStatus
  fingerprint?: string
  changed: boolean
  reason: string
}

export interface CurriculumSourceCandidate {
  sourceId: string
  status: 'NEEDS_REVIEW'
  detectedAt: string
  previousFingerprint?: string
  candidateFingerprint: string
  sourceUrl: string
  finalUrl: string
  reason: string
}

const officialResources = CURRICULUM_RESOURCES.filter((resource) => resource.trustStatus === 'OFFICIAL')
export const TRUSTED_CURRICULUM_SOURCES: TrustedCurriculumSource[] = officialResources
  .filter((resource, index) => officialResources.findIndex((candidate) => candidate.sourceUrl === resource.sourceUrl) === index)
  .map((resource) => ({
    id: resource.id,
    url: resource.sourceUrl,
    authority: resource.source,
    expectedDomain: resource.sourceDomain
  }))

function isTrustedUrl(value: string, expectedDomain: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === expectedDomain || url.hostname.endsWith(`.${expectedDomain}`))
  } catch {
    return false
  }
}

function fingerprint(value: string) {
  return createHash('sha256').update(value.replace(/\s+/g, ' ').trim()).digest('hex')
}

export async function checkCurriculumSource(source: TrustedCurriculumSource, fetcher: typeof fetch = fetch, checkedAt = new Date().toISOString()): Promise<{ check: CurriculumSourceCheck; candidate?: CurriculumSourceCandidate }> {
  if (!isTrustedUrl(source.url, source.expectedDomain)) return { check: { sourceId: source.id, sourceUrl: source.url, checkedAt, status: 'BROKEN', changed: false, reason: 'Source URL is not HTTPS or is outside its trusted authority domain.' } }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetcher(source.url, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'MuksBooks Curriculum Source Monitor/1.0' } })
    const finalUrl = response.url || source.url
    if (!isTrustedUrl(finalUrl, source.expectedDomain)) return { check: { sourceId: source.id, sourceUrl: source.url, finalUrl, checkedAt, httpStatus: response.status, status: 'BROKEN', changed: false, reason: 'Redirect left the trusted authority domain.' } }
    if (!response.ok) return { check: { sourceId: source.id, sourceUrl: source.url, finalUrl, checkedAt, httpStatus: response.status, status: 'BROKEN', changed: false, reason: `Authority source returned HTTP ${response.status}.` } }
    const body = await response.text()
    const nextFingerprint = fingerprint(body)
    const changed = Boolean(source.previousFingerprint && source.previousFingerprint !== nextFingerprint)
    const needsReview = changed || (!source.previousFingerprint && finalUrl !== source.url)
    const check: CurriculumSourceCheck = { sourceId: source.id, sourceUrl: source.url, finalUrl, checkedAt, httpStatus: response.status, status: needsReview ? 'NEEDS_REVIEW' : 'ACTIVE', fingerprint: nextFingerprint, changed, reason: changed ? 'Content fingerprint changed; canonical metadata was not updated.' : needsReview ? 'Authority redirected to a new URL; review is required.' : 'HTTPS authority source is reachable.' }
    return needsReview ? { check, candidate: { sourceId: source.id, status: 'NEEDS_REVIEW', detectedAt: checkedAt, previousFingerprint: source.previousFingerprint, candidateFingerprint: nextFingerprint, sourceUrl: source.url, finalUrl, reason: check.reason } } : { check }
  } catch (error) {
    return { check: { sourceId: source.id, sourceUrl: source.url, checkedAt, status: 'BROKEN', changed: false, reason: error instanceof Error ? error.message : 'Authority source check failed.' } }
  } finally {
    clearTimeout(timeout)
  }
}

export async function checkCurriculumSources(sources: TrustedCurriculumSource[], fetcher: typeof fetch = fetch) {
  const checks: CurriculumSourceCheck[] = []
  const candidates: CurriculumSourceCandidate[] = []
  const concurrency = 6
  for (let index = 0; index < sources.length; index += concurrency) {
    const results = await Promise.all(sources.slice(index, index + concurrency).map((source) => checkCurriculumSource(source, fetcher)))
    for (const result of results) {
      checks.push(result.check)
      if (result.candidate) candidates.push(result.candidate)
    }
  }
  return { checks, candidates }
}