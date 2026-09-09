import type { LearnerProfile, UniversityPlanningProfile } from '@/lib/learner/store'
import type { ApplicantContext, EnglishRequirement, MatchExplanation, Programme } from './types'

export function resolveApplicantContext(profile: LearnerProfile | null, planning: UniversityPlanningProfile, targetCountry?: string): ApplicantContext {
  if (!targetCountry) return { citizenships: planning.citizenships, residenceCountry: planning.residenceCountry, schoolCountry: profile?.school?.country, likelyApplicantType: 'UNCERTAIN', explanation: 'Choose a study country to assess likely applicant context.' }
  const isCitizen = planning.citizenships.some((country) => country.toLowerCase() === targetCountry.toLowerCase())
  if (isCitizen) return { citizenships: planning.citizenships, residenceCountry: planning.residenceCountry, schoolCountry: profile?.school?.country, targetCountry, likelyApplicantType: 'DOMESTIC', explanation: `Your recorded citizenship suggests you may be treated as a domestic applicant in ${targetCountry}. Confirm fee status with the institution.` }
  if (planning.citizenships.length) return { citizenships: planning.citizenships, residenceCountry: planning.residenceCountry, schoolCountry: profile?.school?.country, targetCountry, likelyApplicantType: 'INTERNATIONAL', explanation: `You may be considered an international applicant in ${targetCountry}. Confirm with the university's official fee-status guidance.` }
  return { citizenships: [], residenceCountry: planning.residenceCountry, schoolCountry: profile?.school?.country, targetCountry, likelyApplicantType: 'UNCERTAIN', explanation: 'Add citizenship to improve domestic/international applicant guidance.' }
}

function numericGrade(value?: string) {
  if (!value) return undefined
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function assessEnglish(requirement: EnglishRequirement, planning: UniversityPlanningProfile) {
  const result = planning.englishTests.find((test) => test.test === requirement.test)
  if (!result?.overall) return `No ${requirement.test} result is recorded.`
  if (requirement.overall && result.overall < requirement.overall) return `${requirement.test} overall is below the published requirement.`
  if (requirement.minimumComponents && !result.components) return `Your ${requirement.test} overall appears sufficient, but component scores are needed.`
  if (requirement.minimumComponents && Object.values(result.components ?? {}).some((score) => score < requirement.minimumComponents!)) return `One or more ${requirement.test} components are below the published minimum.`
  return `${requirement.test} information appears to satisfy the published scores; confirm the current policy.`
}

export function matchProgramme(programme: Programme, profile: LearnerProfile | null, planning: UniversityPlanningProfile): MatchExplanation {
  const requirements = programme.requirements?.filter((requirement) => requirement.curriculum === profile?.curriculum) ?? []
  if (!profile) return { state: 'MISSING_INFORMATION', title: 'Personalise to compare', reasons: [], checks: ['Add your curriculum and grades to compare your profile with published requirements.'] }
  if (!requirements.length) return { state: 'REQUIREMENTS_NOT_STRUCTURED', title: 'Requirements not structured', reasons: planning.studyAreas.some((area) => programme.studyAreas.includes(area)) ? ['This programme aligns with a selected study area.'] : [], checks: ['Check official course requirements.', 'Published requirements are not yet structured for your curriculum.'] }

  const requirement = requirements[0]
  const reasons: string[] = []
  const checks: string[] = []
  let missingSubject = false
  for (const required of requirement.requiredSubjects ?? []) {
    const subject = profile.subjects.find((entry) => entry.name.toLowerCase().includes(required.name.toLowerCase()))
    if (!subject) {
      missingSubject = true
      checks.push(`Required ${required.name} subject not found in your profile.`)
      continue
    }
    const predicted = numericGrade(subject.predictedGrade)
    const current = numericGrade(subject.currentGrade)
    const used = predicted ?? current
    if (required.minimumGrade && used !== undefined && used < Number(required.minimumGrade)) checks.push(`${required.name} appears below the published subject requirement.`)
    else reasons.push(`${required.name}${subject.level ? ` ${subject.level}` : ''} is present in your profile.`)
  }

  const overall = planning.predictedOverall
  if (requirement.minimumOverall !== undefined) {
    if (overall === undefined) checks.push(`Add a predicted ${profile.curriculum} overall score for academic matching.`)
    else if (overall >= requirement.minimumOverall) reasons.push(`Predicted overall appears above the published threshold of ${requirement.minimumOverall}.`)
    else checks.push(`Predicted overall is below the published threshold of ${requirement.minimumOverall}.`)
  }

  if (programme.englishRequirements?.length) checks.push(assessEnglish(programme.englishRequirements[0], planning))
  else checks.push('English-language requirement has not been assessed.')

  if (missingSubject) return { state: 'PREREQUISITE_GAP', title: 'Prerequisite gap', reasons, checks }
  if (checks.some((item) => item.includes('below'))) return { state: 'REACH', title: 'Reach', reasons, checks }
  if (overall === undefined) return { state: 'MISSING_INFORMATION', title: 'More information needed', reasons, checks }
  return { state: 'POTENTIAL_MATCH', title: 'Potential match', reasons, checks }
}
