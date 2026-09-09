import { parse } from 'parse5'
import { createHash } from 'node:crypto'
import { reconcileDeadline } from './application-domain.ts'
import { ADMISSIONS_POLICIES, ADMISSIONS_TEST_FEES, ADMISSIONS_TEST_SESSIONS } from './admissions-data.ts'
import { ADMISSIONS_DEADLINES, CURRICULUM_RESULTS_EVENTS, OFFICIAL_UNIVERSITY_SOURCES, UNIVERSITY_DATA_CHECKED_AT } from './fresh-data.ts'
import type { AdmissionsDeadline, AdmissionsPolicy, AdmissionsTestFee, AdmissionsTestSession, CurriculumResultsEvent, FreshDataChange, FreshUniversityDataKind, FreshUniversitySource, SourceType } from './types'

export const FRESH_SOURCE_PRIORITY: Record<SourceType, number> = {
  'official-test-provider': 1,
  'official-programme': 2,
  'official-course-finder': 2,
  'official-prospectus': 2,
  'official-admissions': 3,
  'official-application-portal': 4,
  'government-register': 5,
  'official-curriculum': 5,
  'official-institution': 5
}

export interface FreshDataSnapshot {
  sources: FreshUniversitySource[]
  deadlines: AdmissionsDeadline[]
  resultsEvents: CurriculumResultsEvent[]
  admissionsPolicies: AdmissionsPolicy[]
  testSessions: AdmissionsTestSession[]
  testFees: AdmissionsTestFee[]
  checkedAt: string
}

export interface OfficialSourceCandidate {
  sourceId: string
  kind: FreshUniversitySource['kind']
  sourceUrl: string
  sourceType: FreshUniversitySource['sourceType']
  checkedAt: string
  confidenceStatus: 'NEEDS_REVIEW'
  pageTitle?: string
  canonicalUrl?: string
  text: string
  signals: {
    dates: string[]
    fees: string[]
    requirementTerms: string[]
    bookingUrls: string[]
    claims: Array<{
      requirementType: FreshUniversityDataKind
      test?: string
      status?: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL' | 'TEST_OPTIONAL' | 'NOT_REQUIRED'
      value?: string
      evidence: string
      confidenceStatus: 'NEEDS_REVIEW'
    }>
  }
}

interface FetchResponse {
  ok: boolean
  status: number
  url: string
  headers: { get(name: string): string | null }
  text(): Promise<string>
  arrayBuffer?(): Promise<ArrayBuffer>
}

type SourceFetcher = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<FetchResponse>

const CADENCE_DAYS: Record<FreshUniversitySource['refreshCadence'], number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 30, QUARTERLY: 90 }

export function sourceRefreshDue(source: FreshUniversitySource, now = new Date()) {
  if (!source.lastCheckedAt) return true
  const elapsed = now.getTime() - new Date(source.lastCheckedAt).getTime()
  return elapsed >= CADENCE_DAYS[source.refreshCadence] * 24 * 60 * 60 * 1000
}

function fingerprint(content: string | ArrayBuffer) {
  const value = typeof content === 'string' ? Buffer.from(content) : Buffer.from(content)
  return createHash('sha256').update(value).digest('hex')
}

function parsedPageMetadata(html: string) {
  const document = parse(html) as unknown as { childNodes?: unknown[] }
  let title = ''
  let canonicalUrl = ''
  const text: string[] = []
  const links: string[] = []
  const visit = (node: any) => {
    if (node.nodeName === 'title') title = (node.childNodes || []).map((child: any) => child.value || '').join('').trim()
    if (node.nodeName === 'link') {
      const attributes = Object.fromEntries((node.attrs || []).map((attribute: { name: string; value: string }) => [attribute.name, attribute.value]))
      if (attributes.rel === 'canonical') canonicalUrl = attributes.href || ''
    }
    if (node.nodeName === 'a') {
      const attributes = Object.fromEntries((node.attrs || []).map((attribute: { name: string; value: string }) => [attribute.name, attribute.value]))
      if (attributes.href) links.push(attributes.href)
    }
    if (node.nodeName === '#text' && typeof node.value === 'string') text.push(node.value)
    for (const child of node.childNodes || []) visit(child)
  }
  visit(document)
  return { title, canonicalUrl, text: text.join(' ').replace(/\s+/g, ' ').trim(), links }
}

function extractReviewSignals(text: string, links: string[]) {
  const month = '(?:January|February|March|April|May|June|July|August|September|October|November|December)'
  const dates = Array.from(new Set(text.match(new RegExp(`\\b(?:\\d{1,2} ${month} \\d{4}|${month} \\d{1,2},? \\d{4})\\b`, 'gi')) || []))
  const fees = Array.from(new Set(text.match(/(?:AUD\$?|USD\$?|GBP|EUR|£|€|\$)\s?\d+(?:\.\d{2})?/gi) || []))
  const requirementTerms = ['required', 'optional', 'exempt', 'interview', 'portfolio', 'prerequisite']
    .filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(text))
  const bookingUrls = Array.from(new Set(links.filter((url) => /^https:\/\//.test(url) && /book|register|apply|portal|sign-?in/i.test(url))))
  const claims: OfficialSourceCandidate['signals']['claims'] = []
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean)
  const tests = ['IELTS', 'TOEFL', 'PTE', 'Cambridge', 'SAT', 'ACT', 'NBT', 'UCAT ANZ', 'UCAT', 'GAMSAT', 'LNAT', 'TMUA', 'ESAT', 'ISAT']
  for (const evidence of sentences) {
    const test = tests.find((candidate) => new RegExp(`\\b${candidate.replace(' ', '\\s+')}\\b`, 'i').test(evidence))
    if (test && /\b(required|recommended|optional|not required|test[- ]optional)\b/i.test(evidence)) {
      const status = /\bnot required\b/i.test(evidence) ? 'NOT_REQUIRED' : /\btest[- ]optional\b/i.test(evidence) ? 'TEST_OPTIONAL' : /\brequired\b/i.test(evidence) ? 'REQUIRED' : /\brecommended\b/i.test(evidence) ? 'RECOMMENDED' : 'OPTIONAL'
      claims.push({ requirementType: 'ADMISSIONS_TEST_REQUIREMENT', test, status, evidence, confidenceStatus: 'NEEDS_REVIEW' })
    }
    if (/\b(exempt|exemption|waived)\b/i.test(evidence) && /\bEnglish\b/i.test(evidence)) claims.push({ requirementType: 'ENGLISH_EXEMPTION', evidence, confidenceStatus: 'NEEDS_REVIEW' })
    if (/\b(IELTS|TOEFL|PTE|Cambridge)\b/i.test(evidence) && /\b(score|minimum|overall|band)\b/i.test(evidence)) claims.push({ requirementType: 'ENGLISH_REQUIREMENT', test, evidence, confidenceStatus: 'NEEDS_REVIEW' })
    for (const date of dates.filter((candidate) => evidence.toLowerCase().includes(candidate.toLowerCase()))) {
      const requirementType: FreshUniversityDataKind = /score.{0,20}(submit|deadline)|submit.{0,20}score/i.test(evidence) ? 'TEST_SCORE_SUBMISSION_DEADLINE' : /register|registration|booking deadline/i.test(evidence) ? 'TEST_REGISTRATION_DATE' : /window|between|from.+to/i.test(evidence) ? 'TEST_WINDOW' : 'TEST_DATE'
      claims.push({ requirementType, test, value: date, evidence, confidenceStatus: 'NEEDS_REVIEW' })
    }
    if (/\binterview\b/i.test(evidence)) claims.push({ requirementType: 'INTERVIEW_REQUIREMENT', evidence, confidenceStatus: 'NEEDS_REVIEW' })
    if (/\bportfolio\b/i.test(evidence)) claims.push({ requirementType: 'PORTFOLIO_REQUIREMENT', evidence, confidenceStatus: 'NEEDS_REVIEW' })
  }
  for (const fee of fees) claims.push({ requirementType: 'TEST_FEE', value: fee, evidence: fee, confidenceStatus: 'NEEDS_REVIEW' })
  for (const bookingUrl of bookingUrls) claims.push({ requirementType: 'TEST_BOOKING_URL', value: bookingUrl, evidence: bookingUrl, confidenceStatus: 'NEEDS_REVIEW' })
  return { dates, fees, requirementTerms, bookingUrls, claims }
}

interface ReviewedRecord {
  id: string
  source: { sourceType: SourceType, url: string }
  changeHistory?: FreshDataChange[]
}

function reconcileReviewedRecords<T extends ReviewedRecord>(current: T[], candidates: T[], fingerprint: (record: T) => string, detectedAt: string) {
  const records = new Map(current.map((record) => [record.id, record]))
  const changes: FreshDataChange[] = []
  const conflicts: string[] = []
  for (const candidate of candidates) {
    const previous = records.get(candidate.id)
    if (!previous) {
      records.set(candidate.id, candidate)
      continue
    }
    const previousValue = fingerprint(previous)
    const currentValue = fingerprint(candidate)
    if (previousValue === currentValue) {
      records.set(candidate.id, { ...candidate, changeHistory: previous.changeHistory })
      continue
    }
    if (FRESH_SOURCE_PRIORITY[candidate.source.sourceType] > FRESH_SOURCE_PRIORITY[previous.source.sourceType]) {
      conflicts.push(candidate.id)
      continue
    }
    const change = { detectedAt, previousValue, currentValue, sourceUrl: candidate.source.url }
    changes.push(change)
    records.set(candidate.id, { ...candidate, changeHistory: [...(previous.changeHistory || []), change] })
  }
  return { records: [...records.values()], changes, conflicts }
}

export class FreshUniversityDataService {
  snapshot(): FreshDataSnapshot {
    return { sources: OFFICIAL_UNIVERSITY_SOURCES, deadlines: ADMISSIONS_DEADLINES, resultsEvents: CURRICULUM_RESULTS_EVENTS, admissionsPolicies: ADMISSIONS_POLICIES, testSessions: ADMISSIONS_TEST_SESSIONS, testFees: ADMISSIONS_TEST_FEES, checkedAt: UNIVERSITY_DATA_CHECKED_AT }
  }

  applyDeadlineCandidates(current: AdmissionsDeadline[], candidates: AdmissionsDeadline[]) {
    const records = new Map(current.map((deadline) => [deadline.id, deadline]))
    const changes: Array<{ id: string; previousDueAt: string; dueAt: string }> = []
    const conflicts: string[] = []
    for (const candidate of candidates) {
      const previous = records.get(candidate.id)
      const result = reconcileDeadline(previous, candidate)
      records.set(candidate.id, result.deadline)
      if (result.changed && previous) changes.push({ id: candidate.id, previousDueAt: previous.dueAt, dueAt: candidate.dueAt })
      if (result.conflict) conflicts.push(candidate.id)
    }
    return { records: [...records.values()], changes, conflicts }
  }

  applyReviewedPolicyCandidates(current: AdmissionsPolicy[], candidates: AdmissionsPolicy[], detectedAt = new Date().toISOString()) {
    return reconcileReviewedRecords(current, candidates, (policy) => JSON.stringify({ admissionsCycle: policy.admissionsCycle, applicantRoutes: policy.applicantRoutes, applicantTypes: policy.applicantTypes, english: policy.english, admissionsTests: policy.admissionsTests, additionalRequirements: policy.additionalRequirements, coverageLevel: policy.coverageLevel }), detectedAt)
  }

  applyReviewedTestSessionCandidates(current: AdmissionsTestSession[], candidates: AdmissionsTestSession[], detectedAt = new Date().toISOString()) {
    return reconcileReviewedRecords(current, candidates, (session) => JSON.stringify({ registrationOpensAt: session.registrationOpensAt, bookingOpensAt: session.bookingOpensAt, registrationDeadline: session.registrationDeadline, lateRegistrationDeadline: session.lateRegistrationDeadline, testStartsAt: session.testStartsAt, testEndsAt: session.testEndsAt, scoreReleaseAt: session.scoreReleaseAt, status: session.status, bookingUrl: session.bookingUrl }), detectedAt)
  }

  applyReviewedTestFeeCandidates(current: AdmissionsTestFee[], candidates: AdmissionsTestFee[], detectedAt = new Date().toISOString()) {
    return reconcileReviewedRecords(current, candidates, (fee) => JSON.stringify({ amount: fee.amount, currency: fee.currency, regionLabel: fee.regionLabel, countryCodes: fee.countryCodes, validFrom: fee.validFrom, validUntil: fee.validUntil }), detectedAt)
  }

  markFailedSource(sourceId: string, checkedAt: string) {
    return OFFICIAL_UNIVERSITY_SOURCES.map((source) => source.id === sourceId ? { ...source, lastCheckedAt: checkedAt, confidenceStatus: 'STALE' as const } : source)
  }

  async retrieveSource(source: FreshUniversitySource, fetcher: SourceFetcher = fetch) {
    if (!source.url.startsWith('https://')) throw new Error('Official sources must use HTTPS.')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)
    try {
      const response = await fetcher(source.url, { headers: { 'user-agent': 'MuksBooks University Source Monitor/1.0' }, signal: controller.signal })
      if (!response.ok) throw new Error(`Official source returned HTTP ${response.status}.`)
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/pdf')) {
        if (!response.arrayBuffer) throw new Error('PDF response body is unavailable.')
        const body = await response.arrayBuffer()
        return { body, finalUrl: response.url || source.url, contentType, contentFingerprint: fingerprint(body) }
      }
      if (!contentType.includes('text/html')) throw new Error(`Unsupported source content type: ${contentType || 'unknown'}.`)
      const body = await response.text()
      return { body, finalUrl: response.url || source.url, contentType, contentFingerprint: fingerprint(body) }
    } finally {
      clearTimeout(timeout)
    }
  }

  extractCandidate(source: FreshUniversitySource, html: string, checkedAt = new Date().toISOString()): OfficialSourceCandidate {
    const metadata = parsedPageMetadata(html)
    return {
      sourceId: source.id,
      kind: source.kind,
      sourceUrl: source.url,
      sourceType: source.sourceType,
      checkedAt,
      confidenceStatus: 'NEEDS_REVIEW',
      pageTitle: metadata.title || undefined,
      canonicalUrl: metadata.canonicalUrl || undefined,
      text: metadata.text,
      signals: extractReviewSignals(metadata.text, metadata.links)
    }
  }

  async refreshSource(source: FreshUniversitySource, fetcher?: SourceFetcher, checkedAt = new Date().toISOString()) {
    try {
      const retrieval = await this.retrieveSource(source, fetcher)
      const unchanged = Boolean(source.contentFingerprint && source.contentFingerprint === retrieval.contentFingerprint)
      if (unchanged) return {
        source: { ...source, lastCheckedAt: checkedAt, lastSuccessfulAt: checkedAt },
        candidate: undefined,
        unchanged: true,
        error: undefined
      }
      if (retrieval.contentType.includes('application/pdf')) return {
        source: { ...source, contentFingerprint: retrieval.contentFingerprint, lastCheckedAt: checkedAt, lastSuccessfulAt: checkedAt },
        candidate: {
          sourceId: source.id, kind: source.kind, sourceUrl: source.url, sourceType: source.sourceType, checkedAt,
          confidenceStatus: 'NEEDS_REVIEW' as const, text: '', signals: { dates: [], fees: [], requirementTerms: [], bookingUrls: [], claims: [] }
        },
        unchanged: false,
        error: undefined
      }
      if (typeof retrieval.body !== 'string') throw new Error('HTML source body is unavailable.')
      const candidate = this.extractCandidate(source, retrieval.body, checkedAt)
      return {
        source: { ...source, contentFingerprint: retrieval.contentFingerprint, lastCheckedAt: checkedAt, lastSuccessfulAt: checkedAt },
        candidate,
        unchanged: false,
        error: undefined
      }
    } catch (error) {
      return {
        source: { ...source, lastCheckedAt: checkedAt, confidenceStatus: 'STALE' as const },
        candidate: undefined,
        unchanged: false,
        error: error instanceof Error ? error.message : 'Official source refresh failed.'
      }
    }
  }
}
