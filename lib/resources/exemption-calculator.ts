export interface ExemptionUnitRequirement {
  unitCodes: string[]
  weight: number
  label?: string
}

export interface ExemptionPathway {
  id: string
  requirements: ExemptionUnitRequirement[]
}

export interface ExemptionSubjectRule {
  code: string
  title: string
  program: 'Foundation' | 'Actuary'
  courseLevel: 'undergraduate' | 'postgraduate'
  pathways: ExemptionPathway[]
  deliveredByInstitute?: boolean
}

export interface ExemptionRuleSnapshot {
  version: string
  status: 'verified' | 'changed' | 'unavailable'
  sourceUrl: string
  sourcePageDate: string
  sourceDocumentHash: string
  gradeSourceUrl: string
  gradeSourceDate: string
  gradeDocumentHash: string
  verifiedAt: string
  nextVerificationAt: string
  effectiveFrom: string
  distinctionMinimum: number
  creditMinimum: number
  rules: ExemptionSubjectRule[]
  prerequisites: Record<'undergraduate' | 'postgraduate', string[]>
  ruleSignature: string
  notice: string
}

export interface UnitResultInput {
  unitCode: string
  mark: number | null
  hypothetical?: boolean
}

export interface PathwayCalculation {
  pathwayId: string
  status: 'eligible-estimate' | 'not-eligible' | 'incomplete' | 'impossible'
  weightedMark: number | null
  completedWeight: number
  requiredRemainingAverage: number | null
  missingUnits: string[]
  belowCreditUnits: string[]
  message: string
}

export interface ExemptionCalculation extends PathwayCalculation {
  subjectCode: string
  unofficial: true
  usesHypotheticalMarks: boolean
}

function calculatePathway(pathway: ExemptionPathway, results: UnitResultInput[], distinctionMinimum: number, creditMinimum: number): PathwayCalculation {
  const resultByCode = new Map(results.map((result) => [result.unitCode.toUpperCase(), result]))
  let achievedWeightedMark = 0
  let completedWeight = 0
  const missingUnits: string[] = []
  const belowCreditUnits: string[] = []

  for (const requirement of pathway.requirements) {
    const resultKeys = requirement.unitCodes.length ? requirement.unitCodes : requirement.label ? [requirement.label.toUpperCase()] : []
    const matching = resultKeys.map((code) => resultByCode.get(code)).find((result) => result?.mark !== null && result?.mark !== undefined)
    if (!matching || matching.mark === null) {
      missingUnits.push(requirement.label || requirement.unitCodes.join(' or '))
      continue
    }
    achievedWeightedMark += matching.mark * requirement.weight
    completedWeight += requirement.weight
    if (matching.mark < creditMinimum) belowCreditUnits.push(matching.unitCode)
  }

  const remainingWeight = Math.max(0, 1 - completedWeight)
  const weightedMark = completedWeight > 0 ? achievedWeightedMark / completedWeight : null
  const requiredRemainingAverage = remainingWeight > 0 ? (distinctionMinimum - achievedWeightedMark) / remainingWeight : null

  if (belowCreditUnits.length) {
    return { pathwayId: pathway.id, status: 'impossible', weightedMark, completedWeight, requiredRemainingAverage, missingUnits, belowCreditUnits, message: `${belowCreditUnits.join(', ')} is below the minimum Credit mark.` }
  }
  if (remainingWeight > 0) {
    const impossible = requiredRemainingAverage !== null && requiredRemainingAverage > 100
    return {
      pathwayId: pathway.id, status: impossible ? 'impossible' : 'incomplete', weightedMark, completedWeight, requiredRemainingAverage,
      missingUnits, belowCreditUnits,
      message: impossible ? 'The Distinction target is no longer mathematically reachable.' : `Complete ${missingUnits.join(', ')} and reach the required weighted result.`
    }
  }
  const eligible = achievedWeightedMark >= distinctionMinimum
  return {
    pathwayId: pathway.id, status: eligible ? 'eligible-estimate' : 'not-eligible', weightedMark: achievedWeightedMark, completedWeight,
    requiredRemainingAverage: null, missingUnits, belowCreditUnits,
    message: eligible ? 'Entered results meet the published grade calculation.' : `The weighted mark is below the ${distinctionMinimum} Distinction threshold.`
  }
}

export function calculateExemptionEstimate(rule: ExemptionSubjectRule, results: UnitResultInput[], snapshot: ExemptionRuleSnapshot): ExemptionCalculation {
  if (rule.deliveredByInstitute || !rule.pathways.length) {
    return {
      subjectCode: rule.code, pathwayId: 'institute', status: 'not-eligible', weightedMark: null, completedWeight: 0,
      requiredRemainingAverage: null, missingUnits: [], belowCreditUnits: [], unofficial: true,
      usesHypotheticalMarks: results.some((result) => result.hypothetical), message: 'This subject is delivered by the Actuaries Institute and is not a Monash exemption calculation.'
    }
  }
  const calculations = rule.pathways.map((pathway) => calculatePathway(pathway, results, snapshot.distinctionMinimum, snapshot.creditMinimum))
  const rank = { 'eligible-estimate': 4, incomplete: 3, 'not-eligible': 2, impossible: 1 }
  const best = calculations.sort((left, right) => rank[right.status] - rank[left.status])[0]
  return { ...best, subjectCode: rule.code, unofficial: true, usesHypotheticalMarks: results.some((result) => result.hypothetical) }
}