import { COUNTRY_OPTIONS, getCountryCatalogue, getInstitution, getInstitutionProgrammes } from './catalog.ts'
import { FUNDING_OPPORTUNITIES, PROGRAMME_COSTS } from './funding-data.ts'
import type { InstitutionCoverageDiagnostic, InstitutionCoverageRating } from './types.ts'

function rating(value: number, partialAt: number, strongAt: number): InstitutionCoverageRating {
  if (value >= strongAt) return 'STRONG'
  if (value >= partialAt) return 'PARTIAL'
  return value > 0 ? 'WEAK' : 'UNKNOWN'
}

export function getInstitutionCoverageDiagnostic(institutionId: string): InstitutionCoverageDiagnostic | undefined {
  const institution = getInstitution(institutionId)
  if (!institution) return undefined

  const programmes = getInstitutionProgrammes(institution.id)
  const facultyCount = new Set(programmes.map((programme) => programme.faculty).filter(Boolean)).size
  const majorCount = programmes.reduce((total, programme) => total + (programme.majors?.length ?? 0) + (programme.specialisations?.length ?? 0) + (programme.streams?.length ?? 0), 0)
  const combinedCount = programmes.filter((programme) => programme.degreeType === 'Double degree' || /\s(?:\/|and)\s/i.test(programme.name)).length
  const requirementsCount = programmes.filter((programme) => programme.requirements?.length || programme.entryRequirements.some((requirement) => !requirement.toLowerCase().startsWith('check '))).length
  const fundingCount = FUNDING_OPPORTUNITIES.filter((opportunity) => opportunity.eligibleInstitutions.includes(institution.id)).length
  const tuitionCount = PROGRAMME_COSTS.filter((cost) => cost.institutionId === institution.id).length
  const applicationLinkCount = programmes.filter((programme) => programme.domesticApplicationUrl || programme.internationalApplicationUrl || programme.applicationUrl || programme.centralApplicationUrl).length
  const programmeCoverage = rating(programmes.length, 10, 20)
  const applicationRatio = programmes.length ? applicationLinkCount / programmes.length : 0
  const applicationLinkCoverage: InstitutionCoverageRating = applicationRatio >= 0.8 ? 'STRONG' : applicationRatio >= 0.4 ? 'PARTIAL' : applicationRatio > 0 ? 'WEAK' : 'UNKNOWN'
  const combinedDegreeCoverage = institution.code === 'AU' ? rating(combinedCount, 1, 4) : combinedCount ? rating(combinedCount, 1, 4) : 'UNKNOWN'
  const ingestionPriority = programmeCoverage === 'WEAK' || programmeCoverage === 'UNKNOWN' || (Boolean(institution.programmeFinderUrl) && programmes.length < 15)
    ? 'HIGH'
    : programmeCoverage === 'PARTIAL' ? 'MEDIUM' : 'MAINTAIN'

  return {
    institutionId: institution.id,
    programmeCoverage,
    facultyCoverage: rating(facultyCount, 3, 5),
    majorCoverage: rating(majorCount, 5, 15),
    combinedDegreeCoverage,
    requirementsCoverage: rating(requirementsCount, Math.max(1, Math.ceil(programmes.length * 0.2)), Math.max(2, Math.ceil(programmes.length * 0.6))),
    fundingCoverage: rating(fundingCount, 1, 3),
    tuitionCoverage: rating(tuitionCount, 1, 2),
    applicationLinkCoverage,
    ingestionPriority,
    evidence: {
      indexedProgrammes: programmes.length,
      indexedFaculties: facultyCount,
      indexedMajorsAndSpecialisations: majorCount,
      indexedCombinedDegrees: combinedCount,
      structuredRequirementRecords: requirementsCount,
      fundingOpportunities: fundingCount,
      tuitionRecords: tuitionCount,
      programmeApplicationLinks: applicationLinkCount
    }
  }
}

export function getAllInstitutionCoverageDiagnostics() {
  return COUNTRY_OPTIONS.slice(1)
    .flatMap((country) => getCountryCatalogue(country)?.institutions ?? [])
    .map((institution) => getInstitutionCoverageDiagnostic(institution.id))
    .filter((diagnostic): diagnostic is InstitutionCoverageDiagnostic => Boolean(diagnostic))
}