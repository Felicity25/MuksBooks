import { createHash } from 'node:crypto'
import { parse, type DefaultTreeAdapterMap } from 'parse5'
import {
  calculateExemptionEstimate,
  type ExemptionPathway,
  type ExemptionRuleSnapshot,
  type ExemptionSubjectRule,
  type ExemptionUnitRequirement,
  type UnitResultInput
} from './exemption-calculator'

export {
  calculateExemptionEstimate,
  type ExemptionPathway,
  type ExemptionRuleSnapshot,
  type ExemptionSubjectRule,
  type ExemptionUnitRequirement,
  type UnitResultInput
} from './exemption-calculator'

export const MONASH_EXEMPTION_SOURCE_URL = 'https://www.monash.edu/business/ebs/study-options/actuarial-program/exemptions'
export const MONASH_GRADE_SOURCE_URL = 'https://www.monash.edu/students/admin/assessments/results/results-legend'

type HtmlNode = DefaultTreeAdapterMap['node']
type HtmlElement = DefaultTreeAdapterMap['element']

const UNDERGRADUATE_RULES: ExemptionSubjectRule[] = [
  foundationRule('CS1', 'Actuarial Statistics', 'undergraduate', [['ETC2560', 50], ['ETC2520', 50]]),
  foundationRule('CS2', 'Risk Modelling and Survival Analysis', 'undergraduate', [['ETC3420', 20], ['ETC3430', 60], ['ETC3550', 20]]),
  foundationRule('CM1', 'Actuarial Mathematics', 'undergraduate', [['ETC2430', 45], ['ETC3530', 55]]),
  foundationRule('CM2', 'Financial Engineering and Loss Reserving', 'undergraduate', [['ETC3420', 20], ['ETC3460', 25], ['ETC3520', 55]]),
  foundationRule('CB1', 'Business Finance', 'undergraduate', [['ACC1100', 50], ['BFC2140', 50]]),
  foundationRule('CB2', 'Business Economics', 'undergraduate', [['ECC1000', 55], ['ECC1100', 45]])
]

const POSTGRADUATE_RULES: ExemptionSubjectRule[] = [
  foundationRule('CS1', 'Actuarial Statistics', 'postgraduate', [['ETC5256', 50], ['ETC5252', 50]]),
  foundationRule('CS2', 'Risk Modelling and Survival Analysis', 'postgraduate', [['ETC5342', 20], ['ETC5343', 60], ['ETC5345/ETC5550', 20]]),
  foundationRule('CM1', 'Actuarial Mathematics', 'postgraduate', [['ETC2430', 45], ['ETC5353', 55]]),
  foundationRule('CM2', 'Financial Engineering and Loss Reserving', 'postgraduate', [['ETC5342', 20], ['ETC5346', 25], ['ETC5352', 55]]),
  foundationRule('CB1', 'Business Finance', 'postgraduate', [['ACF5950', 50], ['BFC2140', 50]]),
  {
    code: 'CB2', title: 'Business Economics', program: 'Foundation', courseLevel: 'postgraduate',
    pathways: [
      { id: 'ECX5953', requirements: [{ unitCodes: ['ECX5953'], weight: 1 }] },
      { id: 'ECF5923_ECF5927', requirements: [{ unitCodes: ['ECF5923'], weight: 0.45 }, { unitCodes: ['ECF5927'], weight: 0.55 }] }
    ]
  },
  actuaryRule('ACC', 'Actuarial Control Cycle', [['ETC4110', 50], ['ETC4120', 50]]),
  {
    ...actuaryRule('DSP', 'Data Analytics Principles', [['ETC5250', 80]]),
    pathways: [{ id: 'default', requirements: [{ unitCodes: ['ETC5250'], weight: 0.8 }, { unitCodes: [], weight: 0.2, label: 'Additional Assessment' }] }]
  },
  { code: 'ALM', title: 'Asset and Liability Management', program: 'Actuary', courseLevel: 'postgraduate', pathways: [], deliveredByInstitute: true },
  { code: 'CMP', title: 'Communication, Modelling and Professionalism', program: 'Actuary', courseLevel: 'postgraduate', pathways: [], deliveredByInstitute: true }
]

function foundationRule(code: string, title: string, courseLevel: 'undergraduate' | 'postgraduate', units: Array<[string, number]>): ExemptionSubjectRule {
  return {
    code, title, program: 'Foundation', courseLevel,
    pathways: [{ id: 'default', requirements: units.map(([unitCodes, weight]) => ({ unitCodes: unitCodes.split('/'), weight: weight / 100 })) }]
  }
}

function actuaryRule(code: string, title: string, units: Array<[string, number]>): ExemptionSubjectRule {
  return {
    code, title, program: 'Actuary', courseLevel: 'postgraduate',
    pathways: [{ id: 'default', requirements: units.map(([unitCodes, weight]) => ({ unitCodes: unitCodes.split('/'), weight: weight / 100 })) }]
  }
}

function canonicalRules(rules: ExemptionSubjectRule[]) {
  return rules.map((rule) => ({
    code: rule.code,
    title: rule.title,
    program: rule.program,
    courseLevel: rule.courseLevel,
    deliveredByInstitute: Boolean(rule.deliveredByInstitute),
    pathways: rule.pathways.map((pathway) => ({
      id: pathway.id,
      requirements: pathway.requirements.map((requirement) => ({
        unitCodes: [...requirement.unitCodes].sort(),
        weight: requirement.weight,
        label: requirement.label || null
      }))
    }))
  }))
}

function hashValue(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

const VERIFIED_RULES = [...UNDERGRADUATE_RULES, ...POSTGRADUATE_RULES]

export const VERIFIED_MONASH_EXEMPTION_SNAPSHOT: ExemptionRuleSnapshot = {
  version: 'monash-2025-12-05-v1',
  status: 'verified',
  sourceUrl: MONASH_EXEMPTION_SOURCE_URL,
  sourcePageDate: '2025-12-05T10:22:02+11:00',
  sourceDocumentHash: 'c5457c3d5ae269dff6937f0e5ac9293f93541ec68ed7c1f2453789102556ad1a',
  gradeSourceUrl: MONASH_GRADE_SOURCE_URL,
  gradeSourceDate: '2025-02-28T17:03:58+11:00',
  gradeDocumentHash: '415b5dcb27fce69f97236af5b51e823b0ab4154c02a86c6c367b0caa61d4a2b7',
  verifiedAt: '2026-08-18T00:00:00.000Z',
  nextVerificationAt: '2027-02-18T00:00:00.000Z',
  effectiveFrom: '2024-01-01',
  distinctionMinimum: 70,
  creditMinimum: 60,
  rules: VERIFIED_RULES,
  prerequisites: {
    undergraduate: ['ETC1000', 'ETC2410', 'ETC2440'],
    postgraduate: ['ETC2410']
  },
  ruleSignature: hashValue(canonicalRules(VERIFIED_RULES)),
  notice: 'Unofficial estimate only. Monash University and the Actuaries Institute make all exemption decisions.'
}

function isElement(node: HtmlNode): node is HtmlElement {
  return 'tagName' in node && 'attrs' in node
}

function children(node: HtmlNode): HtmlNode[] {
  return 'childNodes' in node ? node.childNodes as HtmlNode[] : []
}

function findById(node: HtmlNode, id: string): HtmlElement | null {
  if (isElement(node) && node.attrs.some((attribute) => attribute.name === 'id' && attribute.value === id)) return node
  for (const child of children(node)) {
    const found = findById(child, id)
    if (found) return found
  }
  return null
}

function descendants(node: HtmlNode, tagName: string): HtmlElement[] {
  const found: HtmlElement[] = []
  if (isElement(node) && node.tagName === tagName) found.push(node)
  for (const child of children(node)) found.push(...descendants(child, tagName))
  return found
}

function textContent(node: HtmlNode): string {
  if ('value' in node && typeof node.value === 'string') return node.value
  return children(node).map(textContent).join(' ')
}

function normalizeText(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseRequirements(value: string): ExemptionUnitRequirement[] {
  const requirements: ExemptionUnitRequirement[] = []
  const pattern = /([A-Z]{3}\d{4}(?:\/[A-Z]{3}\d{4})?)\s*\((\d+)%\)/g
  for (const match of value.matchAll(pattern)) {
    requirements.push({ unitCodes: match[1].split('/'), weight: Number(match[2]) / 100 })
  }
  if (/Additional Assessment\s*\(20%\)/i.test(value)) requirements.push({ unitCodes: [], weight: 0.2, label: 'Additional Assessment' })
  return requirements
}

function codeFromTitle(title: string) {
  const code = title.match(/^(CS1|CS2|CM1|CM2|CB1|CB2)\b/)?.[1]
  if (code) return code
  if (/Actuarial Control Cycle/i.test(title)) return 'ACC'
  if (/Data Analytics Principles/i.test(title)) return 'DSP'
  if (/Asset and Liability Management/i.test(title)) return 'ALM'
  if (/Communication, Modelling and Professionalism/i.test(title)) return 'CMP'
  return title
}

function cleanTitle(value: string) {
  return normalizeText(value).replace(/^(CS1|CS2|CM1|CM2|CB1|CB2)\s+/, '')
}

function parseMappingTable(html: string, tableId: string, courseLevel: 'undergraduate' | 'postgraduate', program: 'Foundation' | 'Actuary') {
  const document = parse(html) as unknown as HtmlNode
  const table = findById(document, tableId)
  if (!table) throw new Error(`Official Monash table ${tableId} was not found.`)

  return descendants(table, 'tr').slice(1).map((row): ExemptionSubjectRule => {
    const cells = descendants(row, 'td')
    const rawTitle = normalizeText(textContent(cells[0]))
    const rawRequirements = normalizeText(textContent(cells[1]))
    const code = codeFromTitle(rawTitle)
    const deliveredByInstitute = /Delivered by the Actuaries Institute/i.test(rawRequirements)
    let pathways: ExemptionPathway[] = []

    if (!deliveredByInstitute) {
      if (code === 'CB2' && courseLevel === 'postgraduate' && /\bor\b/i.test(rawRequirements)) {
        pathways = [
          { id: 'ECX5953', requirements: [{ unitCodes: ['ECX5953'], weight: 1 }] },
          { id: 'ECF5923_ECF5927', requirements: parseRequirements(rawRequirements).filter((requirement) => !requirement.unitCodes.includes('ECX5953')) }
        ]
      } else {
        pathways = [{ id: 'default', requirements: parseRequirements(rawRequirements) }]
      }
    }

    return { code, title: cleanTitle(rawTitle), program, courseLevel, pathways, deliveredByInstitute }
  })
}

export function parseMonashExemptionRules(html: string) {
  const document = parse(html) as unknown as HtmlNode
  const pageText = normalizeText(textContent(document))
  const requiredStatements = [
    'Where only one unit is listed, you must get a distinction grade in that unit.',
    'Where two or more units are listed, you will need to get an overall weighted average distinction grade, with a minimum of a credit in each unit.'
  ]
  if (!requiredStatements.every((statement) => pageText.includes(statement))) {
    throw new Error('Official Monash exemption threshold wording changed or could not be found.')
  }

  const rules = [
    ...parseMappingTable(html, 'table87129', 'undergraduate', 'Foundation'),
    ...parseMappingTable(html, 'table19404', 'postgraduate', 'Foundation'),
    ...parseMappingTable(html, 'table43020', 'postgraduate', 'Actuary')
  ]
  return { rules, ruleSignature: hashValue(canonicalRules(rules)) }
}

export function verifyMonashGradeThresholds(html: string) {
  const text = normalizeText(textContent(parse(html) as unknown as HtmlNode)).replace(/[–—]/g, '-')
  const distinctionVerified = /Distinction\s+(?:D\s+)?70\s*-\s*79/i.test(text)
  const creditVerified = /Credit\s+(?:C\s+)?60\s*-\s*69/i.test(text)
  if (!distinctionVerified || !creditVerified) throw new Error('Official Monash grade thresholds changed or could not be found.')
  return { distinctionMinimum: 70, creditMinimum: 60 }
}

export async function verifyCurrentMonashExemptionSource(fetcher: typeof fetch = fetch) {
  const headers = { 'User-Agent': 'MuksBooks/1.0 (+https://muksbooks.vercel.app)', Accept: 'text/html' }
  const [rulesResponse, gradesResponse] = await Promise.all([
    fetcher(MONASH_EXEMPTION_SOURCE_URL, { headers, redirect: 'follow' }),
    fetcher(MONASH_GRADE_SOURCE_URL, { headers, redirect: 'follow' })
  ])
  if (!rulesResponse.ok) throw new Error(`Official Monash exemptions source returned HTTP ${rulesResponse.status}.`)
  if (!gradesResponse.ok) throw new Error(`Official Monash grading source returned HTTP ${gradesResponse.status}.`)

  const [rulesHtml, gradesHtml] = await Promise.all([rulesResponse.text(), gradesResponse.text()])
  const parsed = parseMonashExemptionRules(rulesHtml)
  const thresholds = verifyMonashGradeThresholds(gradesHtml)
  const changed = parsed.ruleSignature !== VERIFIED_MONASH_EXEMPTION_SNAPSHOT.ruleSignature
  return {
    checkedAt: new Date().toISOString(),
    changed,
    status: changed ? 'changed' as const : 'verified' as const,
    ruleSignature: parsed.ruleSignature,
    sourceDocumentHash: createHash('sha256').update(rulesHtml).digest('hex'),
    gradeDocumentHash: createHash('sha256').update(gradesHtml).digest('hex'),
    thresholds,
    rules: parsed.rules
  }
}
