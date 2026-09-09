import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { parse } from 'parse5'
import { getCountryCatalogue } from '../lib/universities/catalog.ts'
import type { CountryCode, Institution } from '../lib/universities/types.ts'

const PRIORITY_COUNTRIES: CountryCode[] = ['ZA', 'AU', 'GB', 'CA', 'US']
const CHECKED_AT = new Date().toISOString()
const OUTPUT_PATH = new URL('../data/university-source-discovery.json', import.meta.url)
const USER_AGENT = 'MuksBooks University Source Discovery/1.0 (+https://muksbooks.com)'
const REQUEST_TIMEOUT_MS = 12_000
const CONCURRENCY = 6

type SourceKey = 'prospectusUrl' | 'programmeFinderUrl' | 'undergraduateAdmissionsUrl' | 'internationalAdmissionsUrl' | 'applicationPortalUrl' | 'facultyUrl' | 'fundingUrl' | 'scholarshipUrl' | 'feesUrl'

type LinkCandidate = {
  key: SourceKey
  label: string
  url: string
  score: number
  discoveredFrom: string
}

type VerifiedSource = LinkCandidate & {
  finalUrl: string
  status: number
  contentType: string
  fingerprint?: string
  verifiedAt: string
}

type InstitutionDiscovery = {
  institutionId: string
  institutionName: string
  countryCode: CountryCode
  officialWebsite: string
  prospectusUrl?: string
  prospectusAcademicYear?: string
  programmeFinderUrl?: string
  undergraduateAdmissionsUrl?: string
  internationalAdmissionsUrl?: string
  applicationPortalUrl?: string
  fundingUrl?: string
  scholarshipUrl?: string
  feesUrl?: string
  facultyUrls: Array<{ name: string; url: string }>
  lastProspectusCheckAt: string
  lastWebsiteRefreshAt: string
  sources: VerifiedSource[]
  errors: string[]
  coverage: 'PROSPECTUS_FOUND' | 'LIVE_WEBSITE_PRIMARY' | 'ACCESS_BLOCKED' | 'WEAK'
}

const LINK_RULES: Array<{ key: SourceKey; pattern: RegExp; score: number }> = [
  { key: 'prospectusUrl', pattern: /undergraduate.{0,35}(prospectus|guide|viewbook)|(?:prospectus|viewbook).{0,35}undergraduate/i, score: 120 },
  { key: 'prospectusUrl', pattern: /\bprospectus\b|undergraduate guide|viewbook/i, score: 90 },
  { key: 'programmeFinderUrl', pattern: /course finder|program(?:me)? finder|find (?:a )?(?:course|program)|undergraduate (?:courses|programmes|programs)|degrees? and programs/i, score: 100 },
  { key: 'undergraduateAdmissionsUrl', pattern: /undergraduate admissions?|apply.{0,20}undergraduate|first[- ]year admissions?/i, score: 95 },
  { key: 'internationalAdmissionsUrl', pattern: /international (?:students?|admissions?|applicants?)|apply.{0,20}international/i, score: 95 },
  { key: 'applicationPortalUrl', pattern: /apply now|application portal|start (?:an?|your) application|online application/i, score: 100 },
  { key: 'facultyUrl', pattern: /facult(?:y|ies)|schools? and (?:faculties|colleges)|academic schools?/i, score: 70 }
  , { key: 'scholarshipUrl', pattern: /undergraduate scholarships?|international scholarships?|scholarships? and awards/i, score: 105 }
  , { key: 'fundingUrl', pattern: /financial aid|fees and funding|student funding|undergraduate bursaries|funding opportunities/i, score: 100 }
  , { key: 'feesUrl', pattern: /tuition fees?|international student fees?|fee calculator|course fees|fees handbook|student fees/i, score: 100 }
]

const FUNDING_SOURCE_EXCLUSIONS = /\b(?:postgraduate|graduate research|research funding|doctoral|phd|staff|executive education|business school|business and industry|collaborate|enterprise funding)\b/i

function normalizedHostname(url: string) {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
}

function universityDomain(url: string, institution: Institution) {
  const hostname = normalizedHostname(url)
  const roots = [institution.officialWebsite, institution.programmeFinderUrl, institution.admissionsUrl]
    .filter(Boolean)
    .map((candidate) => normalizedHostname(candidate!))
  return roots.some((root) => hostname === root || hostname.endsWith(`.${root}`) || root.endsWith(`.${hostname}`))
}

function cleanUrl(rawUrl: string, baseUrl: string) {
  try {
    const url = new URL(rawUrl, baseUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    url.hash = ''
    for (const parameter of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid)/i.test(parameter)) url.searchParams.delete(parameter)
    }
    return url.toString()
  } catch {
    return undefined
  }
}

function pageLinks(html: string, pageUrl: string, institution: Institution) {
  const document = parse(html) as any
  const links: LinkCandidate[] = []
  const visit = (node: any) => {
    if (node.nodeName === 'a') {
      const attributes = Object.fromEntries((node.attrs || []).map((attribute: { name: string; value: string }) => [attribute.name, attribute.value]))
      const url = attributes.href ? cleanUrl(attributes.href, pageUrl) : undefined
      const label = (node.childNodes || []).map((child: any) => child.value || '').join(' ').replace(/\s+/g, ' ').trim()
      if (url && universityDomain(url, institution)) {
        const searchable = `${label} ${url}`
        for (const rule of LINK_RULES) {
          if (['fundingUrl', 'scholarshipUrl', 'feesUrl'].includes(rule.key) && FUNDING_SOURCE_EXCLUSIONS.test(searchable)) continue
          if (rule.key === 'fundingUrl' && /fees handbook|student fees/i.test(searchable)) continue
          if (rule.pattern.test(searchable)) links.push({ key: rule.key, label: label || rule.key, url, score: rule.score + (url.toLowerCase().endsWith('.pdf') ? 15 : 0), discoveredFrom: pageUrl })
        }
      }
    }
    for (const child of node.childNodes || []) visit(child)
  }
  visit(document)
  return links
}

async function fetchOfficial(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/pdf;q=0.9,*/*;q=0.5' } })
    const contentType = response.headers.get('content-type') || ''
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    if (contentType.includes('application/pdf') || response.url.toLowerCase().endsWith('.pdf')) {
      const bytes = await response.arrayBuffer()
      return { finalUrl: response.url, status: response.status, contentType: contentType || 'application/pdf', fingerprint: createHash('sha256').update(Buffer.from(bytes)).digest('hex'), html: undefined }
    }
    const html = await response.text()
    return { finalUrl: response.url, status: response.status, contentType, fingerprint: createHash('sha256').update(html).digest('hex'), html }
  } finally {
    clearTimeout(timeout)
  }
}

function seedCandidates(institution: Institution) {
  const candidates: LinkCandidate[] = []
  const add = (key: SourceKey, url: string | undefined, label: string, score = 130) => {
    if (url) candidates.push({ key, url, label, score, discoveredFrom: 'catalogue' })
  }
  add('prospectusUrl', institution.prospectusUrl, 'Indexed prospectus')
  add('programmeFinderUrl', institution.programmeFinderUrl, 'Indexed programme finder')
  add('undergraduateAdmissionsUrl', institution.undergraduateAdmissionsUrl || institution.admissionsUrl, 'Indexed undergraduate admissions')
  add('internationalAdmissionsUrl', institution.internationalAdmissionsUrl, 'Indexed international admissions')
  add('applicationPortalUrl', institution.applicationPortalUrl || institution.applicationUrl, 'Indexed application route')
  for (const faculty of institution.facultyUrls || []) add('facultyUrl', faculty.url, faculty.name)
  return candidates
}

function deduplicate(candidates: LinkCandidate[]) {
  const unique = new Map<string, LinkCandidate>()
  for (const candidate of candidates.sort((left, right) => right.score - left.score)) {
    const key = `${candidate.key}:${candidate.url.replace(/\/$/, '')}`
    if (!unique.has(key)) unique.set(key, candidate)
  }
  return [...unique.values()]
}

async function discoverInstitution(institution: Institution, countryCode: CountryCode): Promise<InstitutionDiscovery> {
  const errors: string[] = []
  const candidates = seedCandidates(institution)
  const roots = deduplicate([
    { key: 'undergraduateAdmissionsUrl', label: 'Official website', url: institution.officialWebsite, score: 1, discoveredFrom: 'catalogue' },
    ...candidates.filter((candidate) => candidate.key === 'programmeFinderUrl' || candidate.key === 'undergraduateAdmissionsUrl')
  ]).slice(0, 3)

  for (const root of roots) {
    try {
      const page = await fetchOfficial(root.url)
      if (page.html) candidates.push(...pageLinks(page.html, page.finalUrl, institution))
    } catch (error) {
      errors.push(`${root.url}: ${error instanceof Error ? error.message : 'fetch failed'}`)
    }
  }

  const selected = deduplicate(candidates)
    .filter((candidate) => candidate.key !== 'facultyUrl' || candidate.score >= 70)
    .filter((candidate, index, all) => all.findIndex((item) => item.key === candidate.key) === index || candidate.key === 'facultyUrl')
    .slice(0, 9)
  const sources: VerifiedSource[] = []
  for (const candidate of selected) {
    try {
      const checked = await fetchOfficial(candidate.url)
      sources.push({ ...candidate, finalUrl: checked.finalUrl, status: checked.status, contentType: checked.contentType, fingerprint: checked.fingerprint, verifiedAt: CHECKED_AT })
      if (candidate.key === 'prospectusUrl' && checked.html) {
        const directPdf = pageLinks(checked.html, checked.finalUrl, institution)
          .filter((link) => link.key === 'prospectusUrl' && link.url.toLowerCase().includes('.pdf'))
          .sort((left, right) => right.score - left.score)[0]
        if (directPdf) {
          const pdf = await fetchOfficial(directPdf.url)
          if (pdf.contentType.includes('application/pdf')) sources.unshift({ ...directPdf, finalUrl: pdf.finalUrl, status: pdf.status, contentType: pdf.contentType, fingerprint: pdf.fingerprint, verifiedAt: CHECKED_AT })
        }
      }
    } catch (error) {
      errors.push(`${candidate.url}: ${error instanceof Error ? error.message : 'verification failed'}`)
    }
  }

  const best = (key: SourceKey) => sources.find((source) => source.key === key)?.finalUrl
  const prospectus = sources.find((source) => source.key === 'prospectusUrl' && source.contentType.includes('application/pdf'))
  const prospectusUrl = prospectus?.finalUrl
  const programmeFinderUrl = best('programmeFinderUrl')
  const undergraduateAdmissionsUrl = best('undergraduateAdmissionsUrl')
  const internationalAdmissionsUrl = best('internationalAdmissionsUrl')
  const applicationPortalUrl = best('applicationPortalUrl')
  const fundingUrl = best('fundingUrl')
  const scholarshipUrl = best('scholarshipUrl')
  const feesUrl = best('feesUrl')
  const facultyUrls = sources.filter((source) => source.key === 'facultyUrl').map((source) => ({ name: source.label, url: source.finalUrl }))
  const usefulLiveSource = Boolean(programmeFinderUrl || undergraduateAdmissionsUrl || internationalAdmissionsUrl || applicationPortalUrl || fundingUrl || scholarshipUrl || feesUrl)
  const accessBlocked = !usefulLiveSource && errors.some((error) => /HTTP 403|aborted|fetch failed/i.test(error))

  return {
    institutionId: institution.id,
    institutionName: institution.name,
    countryCode,
    officialWebsite: institution.officialWebsite,
    prospectusUrl,
    prospectusAcademicYear: prospectusUrl ? institution.prospectusAcademicYear : undefined,
    programmeFinderUrl,
    undergraduateAdmissionsUrl,
    internationalAdmissionsUrl,
    applicationPortalUrl,
    fundingUrl,
    scholarshipUrl,
    feesUrl,
    facultyUrls,
    lastProspectusCheckAt: CHECKED_AT,
    lastWebsiteRefreshAt: CHECKED_AT,
    sources,
    errors,
    coverage: prospectusUrl ? 'PROSPECTUS_FOUND' : usefulLiveSource ? 'LIVE_WEBSITE_PRIMARY' : accessBlocked ? 'ACCESS_BLOCKED' : 'WEAK'
  }
}

async function concurrentMap<T, R>(values: T[], worker: (value: T) => Promise<R>) {
  const results = new Array<R>(values.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++
      results[index] = await worker(values[index])
    }
  }))
  return results
}

async function main() {
  const institutions = PRIORITY_COUNTRIES.flatMap((countryCode) => (getCountryCatalogue(countryCode)?.institutions || []).map((institution) => ({ institution, countryCode })))
  const discoveries = await concurrentMap(institutions, ({ institution, countryCode }) => discoverInstitution(institution, countryCode))
  const report = {
    generatedAt: CHECKED_AT,
    reviewStatus: 'CANDIDATES_REQUIRE_REVIEW',
    countries: PRIORITY_COUNTRIES,
    metrics: {
      institutions: discoveries.length,
      prospectusFound: discoveries.filter((item) => item.coverage === 'PROSPECTUS_FOUND').length,
      liveWebsitePrimary: discoveries.filter((item) => item.coverage === 'LIVE_WEBSITE_PRIMARY').length,
      accessBlocked: discoveries.filter((item) => item.coverage === 'ACCESS_BLOCKED').length,
      weak: discoveries.filter((item) => item.coverage === 'WEAK').length,
      programmeFinders: discoveries.filter((item) => item.programmeFinderUrl).length,
      undergraduateAdmissionsPages: discoveries.filter((item) => item.undergraduateAdmissionsUrl).length,
      internationalAdmissionsPages: discoveries.filter((item) => item.internationalAdmissionsUrl).length,
      exactApplicationLinks: discoveries.filter((item) => item.applicationPortalUrl).length,
      fundingPages: discoveries.filter((item) => item.fundingUrl).length,
      scholarshipPages: discoveries.filter((item) => item.scholarshipUrl).length,
      feePages: discoveries.filter((item) => item.feesUrl).length,
      verifiedSources: discoveries.reduce((sum, item) => sum + item.sources.length, 0)
    },
    institutions: discoveries
  }
  await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report.metrics, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
