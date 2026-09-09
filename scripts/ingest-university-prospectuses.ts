import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { extractTextFromUploadDetailed } from '../lib/course-manager/extractors.ts'
import { extractProspectusCandidates } from '../lib/universities/prospectus-extractor.ts'

const DISCOVERY_PATH = new URL('../data/university-source-discovery.json', import.meta.url)
const OUTPUT_PATH = new URL('../data/university-prospectus-candidates.json', import.meta.url)
const MINIMUM_CURRENT_YEAR = new Date().getFullYear()

type DiscoverySource = { key: string; label: string; finalUrl: string; contentType: string; fingerprint?: string }
type DiscoveryInstitution = { institutionId: string; institutionName: string; countryCode: string; sources: DiscoverySource[] }

function academicYear(source: DiscoverySource) {
  const years = `${source.label} ${source.finalUrl}`.match(/20\d{2}/g)?.map(Number) || []
  return years.length ? String(Math.max(...years)) : undefined
}

function qualification(source: DiscoverySource) {
  const identity = `${source.label} ${decodeURIComponent(source.finalUrl)}`
  const year = academicYear(source)
  if (!source.contentType.includes('application/pdf')) return { accepted: false, reason: 'Not a PDF document', year }
  if (/student fees?|tuition fees?|postgraduate/i.test(identity)) return { accepted: false, reason: 'Not a general undergraduate guide', year }
  if (/\/Delhi\//i.test(source.finalUrl)) return { accepted: false, reason: 'Regional campus guide, not the institution-wide prospectus', year }
  if (!/undergraduate|viewbook|prospectus/i.test(identity)) return { accepted: false, reason: 'Undergraduate prospectus identity not established', year }
  if (year && Number(year) < MINIMUM_CURRENT_YEAR) return { accepted: false, reason: `Historical ${year} document`, year }
  return { accepted: true, reason: 'Current general undergraduate guide candidate', year }
}

async function ingest(institution: DiscoveryInstitution) {
  const source = institution.sources.find((candidate) => candidate.key === 'prospectusUrl' && candidate.contentType.includes('application/pdf'))
  if (!source) return { institutionId: institution.institutionId, institutionName: institution.institutionName, countryCode: institution.countryCode, status: 'NO_DIRECT_PDF' as const }
  const qualified = qualification(source)
  if (!qualified.accepted) return { institutionId: institution.institutionId, institutionName: institution.institutionName, countryCode: institution.countryCode, status: 'EXCLUDED' as const, sourceUrl: source.finalUrl, academicYear: qualified.year, reason: qualified.reason }
  try {
    const response = await fetch(source.finalUrl, { headers: { 'user-agent': 'MuksBooks Prospectus Ingestion/1.0 (+https://muksbooks.com)' }, signal: AbortSignal.timeout(20_000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    const documentFingerprint = createHash('sha256').update(bytes).digest('hex')
    if (source.fingerprint && source.fingerprint !== documentFingerprint) throw new Error('Document changed since discovery; rediscover before review.')
    const extracted = await extractTextFromUploadDetailed({ fileName: new URL(source.finalUrl).pathname.split('/').pop() || 'prospectus.pdf', mimeType: 'application/pdf', content: bytes })
    if (!extracted.pages.length) throw new Error('No page-level text could be extracted.')
    const candidates = extractProspectusCandidates({ institutionId: institution.institutionId, sourceUrl: source.finalUrl, documentFingerprint, pages: extracted.pages })
    return {
      institutionId: institution.institutionId,
      institutionName: institution.institutionName,
      countryCode: institution.countryCode,
      status: 'REVIEW_REQUIRED' as const,
      sourceUrl: source.finalUrl,
      academicYear: qualified.year,
      metrics: {
        pages: candidates.pageCount,
        faculties: candidates.faculties.length,
        programmes: candidates.faculties.reduce((sum, faculty) => sum + faculty.programmes.length, 0) + candidates.unassignedProgrammes.length,
        requirementsDeadlinesAndTests: candidates.faculties.reduce((sum, faculty) => sum + faculty.claims.length, 0) + candidates.unassignedClaims.length
      },
      candidates
    }
  } catch (error) {
    return { institutionId: institution.institutionId, institutionName: institution.institutionName, countryCode: institution.countryCode, status: 'FAILED' as const, sourceUrl: source.finalUrl, academicYear: qualified.year, reason: error instanceof Error ? error.message : 'Prospectus ingestion failed' }
  }
}

async function main() {
  const discovery = JSON.parse(await readFile(DISCOVERY_PATH, 'utf8')) as { institutions: DiscoveryInstitution[] }
  const institutions = []
  for (const institution of discovery.institutions) institutions.push(await ingest(institution))
  const reviewed = institutions.filter((institution) => institution.status === 'REVIEW_REQUIRED')
  const report = {
    generatedAt: new Date().toISOString(),
    confidenceStatus: 'NEEDS_REVIEW',
    metrics: {
      currentProspectusesProcessed: reviewed.length,
      excludedDocuments: institutions.filter((institution) => institution.status === 'EXCLUDED').length,
      failedDocuments: institutions.filter((institution) => institution.status === 'FAILED').length,
      facultySections: reviewed.reduce((sum, institution) => sum + (institution.metrics?.faculties || 0), 0),
      programmeCandidates: reviewed.reduce((sum, institution) => sum + (institution.metrics?.programmes || 0), 0),
      requirementsDeadlinesAndTestingCandidates: reviewed.reduce((sum, institution) => sum + (institution.metrics?.requirementsDeadlinesAndTests || 0), 0)
    },
    institutions
  }
  await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report.metrics, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
