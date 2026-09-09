import { parse } from 'parse5'
import { reconcileDeadline } from './application-domain.ts'
import { ADMISSIONS_DEADLINES, CURRICULUM_RESULTS_EVENTS, OFFICIAL_UNIVERSITY_SOURCES, UNIVERSITY_DATA_CHECKED_AT } from './fresh-data.ts'
import type { AdmissionsDeadline, CurriculumResultsEvent, FreshUniversitySource } from './types'

export interface FreshDataSnapshot {
  sources: FreshUniversitySource[]
  deadlines: AdmissionsDeadline[]
  resultsEvents: CurriculumResultsEvent[]
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
}

interface FetchResponse {
  ok: boolean
  status: number
  url: string
  headers: { get(name: string): string | null }
  text(): Promise<string>
}

type SourceFetcher = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<FetchResponse>

function parsedPageMetadata(html: string) {
  const document = parse(html) as unknown as { childNodes?: unknown[] }
  let title = ''
  let canonicalUrl = ''
  const text: string[] = []
  const visit = (node: any) => {
    if (node.nodeName === 'title') title = (node.childNodes || []).map((child: any) => child.value || '').join('').trim()
    if (node.nodeName === 'link') {
      const attributes = Object.fromEntries((node.attrs || []).map((attribute: { name: string; value: string }) => [attribute.name, attribute.value]))
      if (attributes.rel === 'canonical') canonicalUrl = attributes.href || ''
    }
    if (node.nodeName === '#text' && typeof node.value === 'string') text.push(node.value)
    for (const child of node.childNodes || []) visit(child)
  }
  visit(document)
  return { title, canonicalUrl, text: text.join(' ').replace(/\s+/g, ' ').trim() }
}

export class FreshUniversityDataService {
  snapshot(): FreshDataSnapshot {
    return { sources: OFFICIAL_UNIVERSITY_SOURCES, deadlines: ADMISSIONS_DEADLINES, resultsEvents: CURRICULUM_RESULTS_EVENTS, checkedAt: UNIVERSITY_DATA_CHECKED_AT }
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
      if (!contentType.includes('text/html')) throw new Error(`Unsupported source content type: ${contentType || 'unknown'}.`)
      return { body: await response.text(), finalUrl: response.url || source.url, contentType }
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
      text: metadata.text
    }
  }

  async refreshSource(source: FreshUniversitySource, fetcher?: SourceFetcher, checkedAt = new Date().toISOString()) {
    try {
      const retrieval = await this.retrieveSource(source, fetcher)
      const candidate = this.extractCandidate(source, retrieval.body, checkedAt)
      return {
        source: { ...source, lastCheckedAt: checkedAt, lastSuccessfulAt: checkedAt },
        candidate,
        error: undefined
      }
    } catch (error) {
      return {
        source: { ...source, lastCheckedAt: checkedAt, confidenceStatus: 'STALE' as const },
        candidate: undefined,
        error: error instanceof Error ? error.message : 'Official source refresh failed.'
      }
    }
  }
}
