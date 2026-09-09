import type { ConfidenceStatus } from './types'

export interface ProspectusPage {
  pageNumber: number
  text: string
}

export interface ProspectusEvidence {
  pageNumber: number
  text: string
}

export interface ProspectusProgrammeCandidate {
  name: string
  faculty: string
  evidence: ProspectusEvidence
  confidenceStatus: Extract<ConfidenceStatus, 'NEEDS_REVIEW'>
}

export interface ProspectusClaimCandidate {
  kind: 'CURRICULUM_REQUIREMENT' | 'ENGLISH_REQUIREMENT' | 'ADMISSIONS_TEST' | 'APPLICATION_DEADLINE' | 'APPLICATION_ROUTE' | 'SCHOLARSHIP' | 'BURSARY' | 'GOVERNMENT_SUPPORT' | 'FUNDING_ELIGIBILITY' | 'SCHOLARSHIP_DEADLINE' | 'FUNDING_AMOUNT' | 'TUITION_FEE' | 'APPLICATION_FEE' | 'FUNDING_APPLICATION_URL'
  faculty: string
  evidence: ProspectusEvidence
  confidenceStatus: Extract<ConfidenceStatus, 'NEEDS_REVIEW'>
}

export interface ProspectusFacultyCandidate {
  name: string
  startPage: number
  endPage: number
  programmes: ProspectusProgrammeCandidate[]
  claims: ProspectusClaimCandidate[]
}

export interface ProspectusExtractionResult {
  institutionId: string
  sourceUrl: string
  documentFingerprint: string
  extractedAt: string
  pageCount: number
  faculties: ProspectusFacultyCandidate[]
  unassignedProgrammes: ProspectusProgrammeCandidate[]
  unassignedClaims: ProspectusClaimCandidate[]
  confidenceStatus: Extract<ConfidenceStatus, 'NEEDS_REVIEW'>
}

const FACULTY_HEADING = /\b(?:faculty|college|school) of ([A-Z][A-Za-z&,()'\- ]{2,70})\b/gi
const DEGREE_PATTERNS = [
  /\bBachelor of (?:Arts|Science|Commerce|Engineering|Laws?|Education|Nursing|Business|Design|Medicine|Music|Social Science|Health Sciences?|Applied Science|Computer Science|Economics|Architecture|Agriculture|Fine Arts|Information Technology)(?:\s*\([^\n)]{2,60}\))?(?:\s+(?:in|with)\s+[A-Z][A-Za-z&,'\- ]{2,60})?/g,
  /\b(?:BSc|BCom|BEng|BA|LLB|MBChB|BEd|BMus|BDes|BArch|BNurs|BASc|BFA|BTech)\s+(?:in\s+)?[A-Z][A-Za-z&,'()\- ]{2,70}/g
]
const CLAIM_RULES: Array<{ kind: ProspectusClaimCandidate['kind']; pattern: RegExp }> = [
  { kind: 'CURRICULUM_REQUIREMENT', pattern: /\b(?:IB|International Baccalaureate|A[- ]levels?|APS|admission point score|NSC|IEB)\b/i },
  { kind: 'ENGLISH_REQUIREMENT', pattern: /\b(?:IELTS|TOEFL|PTE|Cambridge English|English language requirement|English exemption)\b/i },
  { kind: 'ADMISSIONS_TEST', pattern: /\b(?:NBT|SAT|ACT|UCAT(?: ANZ)?|GAMSAT|LNAT|TMUA|ESAT|ISAT)\b/i },
  { kind: 'APPLICATION_DEADLINE', pattern: /\b(?:closing date|application deadline|applications? close)\b/i },
  { kind: 'APPLICATION_ROUTE', pattern: /\b(?:apply online|application portal|UCAS|OUAC|VTAC|UAC|QTAC|Common App|UC application)\b/i }
  , { kind: 'SCHOLARSHIP', pattern: /\b(?:undergraduate|entrance|merit|international) scholarships?\b/i }
  , { kind: 'BURSARY', pattern: /\b(?:undergraduate|student|financial) bursar(?:y|ies)\b/i }
  , { kind: 'GOVERNMENT_SUPPORT', pattern: /\b(?:NSFAS|HECS-HELP|FEE-HELP|Commonwealth Supported Place|student finance)\b/i }
  , { kind: 'FUNDING_ELIGIBILITY', pattern: /\b(?:scholarship|bursary|financial aid).{0,40}(?:eligible|eligibility|qualif(?:y|ies))\b/i }
  , { kind: 'SCHOLARSHIP_DEADLINE', pattern: /\b(?:scholarship|bursary).{0,40}(?:closing date|deadline|applications? close)\b/i }
  , { kind: 'FUNDING_AMOUNT', pattern: /(?:R|A\$|C\$|US\$|£|\$)\s?[\d,.]+.{0,50}(?:scholarship|bursary|grant|award)/i }
  , { kind: 'TUITION_FEE', pattern: /\b(?:annual |international |domestic )?tuition fees?\b/i }
  , { kind: 'APPLICATION_FEE', pattern: /\bapplication fee\b/i }
  , { kind: 'FUNDING_APPLICATION_URL', pattern: /\b(?:apply for (?:a |the )?(?:scholarship|bursary)|funding portal|scholarship application)\b/i }
]

function cleanEvidence(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 600)
}

function normalizedFacultyName(value: string) {
  return value
    .replace(/\s+(?:UNDERGRADUATE|PROGRAMMES?|COURSES?|PROSPECTUS).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function facultyHeadings(page: ProspectusPage) {
  const headings: string[] = []
  for (const match of page.text.matchAll(FACULTY_HEADING)) {
    const name = normalizedFacultyName(match[1])
    if (name.length >= 3 && name.length <= 80 && !headings.some((entry) => entry.toLowerCase() === name.toLowerCase())) headings.push(name)
  }
  return headings
}

function programmeNames(text: string) {
  const names = new Set<string>()
  for (const pattern of DEGREE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const name = cleanEvidence(match[0]).replace(/[.,;:]$/, '')
      if (name.length >= 5 && name.length <= 120) names.add(name)
    }
  }
  return [...names]
}

function claimEvidence(text: string) {
  const chunks = text.split(/(?<=[.!?])\s+|\n+/).map(cleanEvidence).filter((value) => value.length >= 12)
  return chunks.flatMap((chunk) => CLAIM_RULES.filter((rule) => rule.pattern.test(chunk)).map((rule) => ({ kind: rule.kind, text: chunk })))
}

export function extractProspectusCandidates(input: {
  institutionId: string
  sourceUrl: string
  documentFingerprint: string
  pages: ProspectusPage[]
  extractedAt?: string
}): ProspectusExtractionResult {
  const sections: ProspectusFacultyCandidate[] = []
  let activeFaculty: ProspectusFacultyCandidate | undefined
  const unassignedProgrammes: ProspectusProgrammeCandidate[] = []
  const unassignedClaims: ProspectusClaimCandidate[] = []

  for (const page of input.pages) {
    const headings = facultyHeadings(page)
    if (headings.length) {
      if (activeFaculty) activeFaculty.endPage = Math.max(activeFaculty.startPage, page.pageNumber - 1)
      activeFaculty = { name: headings[0], startPage: page.pageNumber, endPage: page.pageNumber, programmes: [], claims: [] }
      sections.push(activeFaculty)
    }
    if (activeFaculty) activeFaculty.endPage = page.pageNumber
    const faculty = activeFaculty?.name || 'Unassigned'
    const programmes = programmeNames(page.text).map((name) => ({ name, faculty, evidence: { pageNumber: page.pageNumber, text: cleanEvidence(name) }, confidenceStatus: 'NEEDS_REVIEW' as const }))
    const claims = claimEvidence(page.text).map((claim) => ({ kind: claim.kind, faculty, evidence: { pageNumber: page.pageNumber, text: claim.text }, confidenceStatus: 'NEEDS_REVIEW' as const }))
    if (activeFaculty) {
      activeFaculty.programmes.push(...programmes)
      activeFaculty.claims.push(...claims)
    } else {
      unassignedProgrammes.push(...programmes)
      unassignedClaims.push(...claims)
    }
  }

  for (const faculty of sections) {
    faculty.programmes = faculty.programmes.filter((candidate, index, values) => values.findIndex((value) => value.name.toLowerCase() === candidate.name.toLowerCase()) === index)
    faculty.claims = faculty.claims.filter((candidate, index, values) => values.findIndex((value) => value.kind === candidate.kind && value.evidence.text === candidate.evidence.text) === index)
  }

  return {
    institutionId: input.institutionId,
    sourceUrl: input.sourceUrl,
    documentFingerprint: input.documentFingerprint,
    extractedAt: input.extractedAt ?? new Date().toISOString(),
    pageCount: input.pages.length,
    faculties: sections,
    unassignedProgrammes,
    unassignedClaims,
    confidenceStatus: 'NEEDS_REVIEW'
  }
}
