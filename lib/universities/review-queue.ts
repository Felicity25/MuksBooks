import prospectusCandidates from '../../data/university-prospectus-candidates.json' with { type: 'json' }
import sourceDiscovery from '../../data/university-source-discovery.json' with { type: 'json' }
import { flattenSearchRecords, normalizeUniversityQuery } from './catalog.ts'

export type ReviewDecisionAction = 'APPROVE' | 'REJECT' | 'MERGE'

export interface UniversityReviewItem {
  id: string
  institutionId: string
  institutionName: string
  countryCode: string
  sourceUrl: string
  sourceFingerprint: string
  candidateType: 'PROGRAMME' | string
  candidateValue: string
  faculty: string
  pageNumber: number
  evidence: string
  confidenceStatus: 'NEEDS_REVIEW'
  duplicateSuspicion: 'NONE' | 'POSSIBLE' | 'EXACT'
  canonicalMatches: Array<{ id: string; name: string }>
}

type Candidate = {
  name?: string
  kind?: string
  faculty: string
  evidence: { pageNumber: number; text: string }
  confidenceStatus: 'NEEDS_REVIEW'
}

type ProspectusInstitution = {
  institutionId: string
  institutionName: string
  countryCode: string
  status: string
  sourceUrl?: string
  candidates?: {
    documentFingerprint: string
    faculties: Array<{ programmes: Candidate[]; claims: Candidate[] }>
    unassignedProgrammes: Candidate[]
    unassignedClaims: Candidate[]
  }
}

function canonicalMatches(institutionId: string, value: string) {
  const normalizedValue = normalizeUniversityQuery(value)
  return flattenSearchRecords()
    .filter((record) => record.institution.id === institutionId)
    .filter((record) => {
      const canonical = normalizeUniversityQuery(record.programme.name)
      return canonical === normalizedValue || canonical.includes(normalizedValue) || normalizedValue.includes(canonical)
    })
    .map((record) => ({ id: record.programme.id, name: record.programme.name }))
    .slice(0, 5)
}

function reviewItem(institution: ProspectusInstitution, candidate: Candidate, candidateType: string, index: number): UniversityReviewItem {
  const value = candidate.name || candidate.kind || candidate.evidence.text.slice(0, 100)
  const matches = candidateType === 'PROGRAMME' ? canonicalMatches(institution.institutionId, value) : []
  const exact = matches.some((match) => normalizeUniversityQuery(match.name) === normalizeUniversityQuery(value))
  return {
    id: [institution.institutionId, institution.candidates?.documentFingerprint, candidateType, candidate.evidence.pageNumber, index, value].map((part) => encodeURIComponent(String(part))).join(':'),
    institutionId: institution.institutionId,
    institutionName: institution.institutionName,
    countryCode: institution.countryCode,
    sourceUrl: institution.sourceUrl || '',
    sourceFingerprint: institution.candidates?.documentFingerprint || '',
    candidateType,
    candidateValue: value,
    faculty: candidate.faculty,
    pageNumber: candidate.evidence.pageNumber,
    evidence: candidate.evidence.text,
    confidenceStatus: 'NEEDS_REVIEW',
    duplicateSuspicion: exact ? 'EXACT' : matches.length ? 'POSSIBLE' : 'NONE',
    canonicalMatches: matches
  }
}

export function buildUniversityReviewQueue() {
  const queue: UniversityReviewItem[] = []
  for (const institution of prospectusCandidates.institutions as ProspectusInstitution[]) {
    if (institution.status !== 'REVIEW_REQUIRED' || !institution.candidates) continue
    const sections = [
      ...institution.candidates.faculties,
      { programmes: institution.candidates.unassignedProgrammes, claims: institution.candidates.unassignedClaims }
    ]
    for (const section of sections) {
      section.programmes.forEach((candidate, index) => queue.push(reviewItem(institution, candidate, 'PROGRAMME', index)))
      section.claims.forEach((candidate, index) => queue.push(reviewItem(institution, candidate, candidate.kind || 'CLAIM', index)))
    }
  }
  for (const institution of sourceDiscovery.institutions as Array<{ institutionId: string; institutionName: string; countryCode: string; sources: Array<{ key: string; label: string; finalUrl: string; fingerprint?: string }> }>) {
    institution.sources.filter((source) => ['fundingUrl', 'scholarshipUrl', 'feesUrl'].includes(source.key)).forEach((source, index) => {
      const fingerprint = source.fingerprint || source.finalUrl
      queue.push({
        id: [institution.institutionId, fingerprint, source.key, index].map((part) => encodeURIComponent(String(part))).join(':'),
        institutionId: institution.institutionId,
        institutionName: institution.institutionName,
        countryCode: institution.countryCode,
        sourceUrl: source.finalUrl,
        sourceFingerprint: fingerprint,
        candidateType: source.key === 'feesUrl' ? 'OFFICIAL_FEE_SOURCE' : source.key === 'scholarshipUrl' ? 'OFFICIAL_SCHOLARSHIP_SOURCE' : 'OFFICIAL_FUNDING_SOURCE',
        candidateValue: source.label,
        faculty: 'Institution-wide source discovery',
        pageNumber: 0,
        evidence: `Official-domain link classified from its label and URL: ${source.label}`,
        confidenceStatus: 'NEEDS_REVIEW',
        duplicateSuspicion: 'NONE',
        canonicalMatches: []
      })
    })
  }
  return queue
}

export function getUniversityReviewDiagnostics() {
  const queue = buildUniversityReviewQueue()
  return {
    candidates: queue.length,
    programmes: queue.filter((item) => item.candidateType === 'PROGRAMME').length,
    fundingClaims: queue.filter((item) => ['SCHOLARSHIP', 'BURSARY', 'GOVERNMENT_SUPPORT', 'FUNDING_ELIGIBILITY', 'SCHOLARSHIP_DEADLINE', 'FUNDING_AMOUNT', 'TUITION_FEE', 'APPLICATION_FEE', 'FUNDING_APPLICATION_URL', 'OFFICIAL_FUNDING_SOURCE', 'OFFICIAL_SCHOLARSHIP_SOURCE', 'OFFICIAL_FEE_SOURCE'].includes(item.candidateType)).length,
    possibleDuplicates: queue.filter((item) => item.duplicateSuspicion !== 'NONE').length,
    sourceDocuments: new Set(queue.map((item) => item.sourceFingerprint)).size
  }
}