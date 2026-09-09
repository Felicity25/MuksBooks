import sourceDiscovery from '../../data/university-source-discovery.json' with { type: 'json' }
import prospectusCandidates from '../../data/university-prospectus-candidates.json' with { type: 'json' }
import type { CountryCode } from './types'

export type InstitutionSourceCoverage = 'PROSPECTUS_FOUND' | 'LIVE_WEBSITE_PRIMARY' | 'ACCESS_BLOCKED' | 'WEAK'

export interface InstitutionSourceProfile {
  institutionId: string
  institutionName: string
  countryCode: CountryCode
  officialWebsite: string
  prospectusUrl?: string
  prospectusAcademicYear?: string
  prospectusFingerprint?: string
  programmeFinderUrl?: string
  undergraduateAdmissionsUrl?: string
  internationalAdmissionsUrl?: string
  applicationPortalUrl?: string
  facultyUrls: Array<{ name: string; url: string }>
  lastProspectusCheckAt: string
  lastWebsiteRefreshAt: string
  coverage: InstitutionSourceCoverage
  reviewStatus: 'NEEDS_REVIEW'
  errors: string[]
}

type DiscoveryRecord = Omit<InstitutionSourceProfile, 'prospectusUrl' | 'prospectusAcademicYear' | 'prospectusFingerprint' | 'reviewStatus'> & {
  prospectusUrl?: string
  prospectusAcademicYear?: string
  sources: Array<{ key: string; finalUrl: string; contentType: string; fingerprint?: string }>
}

type ProspectusRecord = {
  institutionId: string
  status: string
  sourceUrl?: string
  academicYear?: string
}

const currentProspectuses = new Map(
  (prospectusCandidates.institutions as ProspectusRecord[])
    .filter((record) => record.status === 'REVIEW_REQUIRED' && record.sourceUrl)
    .map((record) => [record.institutionId, record])
)

export const PRIORITY_INSTITUTION_SOURCE_PROFILES: InstitutionSourceProfile[] = (sourceDiscovery.institutions as DiscoveryRecord[]).map((record) => {
  const currentProspectus = currentProspectuses.get(record.institutionId)
  const prospectusSource = currentProspectus
    ? record.sources.find((source) => source.key === 'prospectusUrl' && source.finalUrl === currentProspectus.sourceUrl)
    : undefined
  return {
    institutionId: record.institutionId,
    institutionName: record.institutionName,
    countryCode: record.countryCode,
    officialWebsite: record.officialWebsite,
    prospectusUrl: currentProspectus?.sourceUrl,
    prospectusAcademicYear: currentProspectus?.academicYear,
    prospectusFingerprint: prospectusSource?.fingerprint,
    programmeFinderUrl: record.programmeFinderUrl,
    undergraduateAdmissionsUrl: record.undergraduateAdmissionsUrl,
    internationalAdmissionsUrl: record.internationalAdmissionsUrl,
    applicationPortalUrl: record.applicationPortalUrl,
    facultyUrls: record.facultyUrls,
    lastProspectusCheckAt: record.lastProspectusCheckAt,
    lastWebsiteRefreshAt: record.lastWebsiteRefreshAt,
    coverage: currentProspectus ? 'PROSPECTUS_FOUND' : record.coverage === 'PROSPECTUS_FOUND' ? 'LIVE_WEBSITE_PRIMARY' : record.coverage,
    reviewStatus: 'NEEDS_REVIEW',
    errors: record.errors
  }
})

export function getInstitutionSourceProfile(institutionId: string) {
  return PRIORITY_INSTITUTION_SOURCE_PROFILES.find((profile) => profile.institutionId === institutionId)
}

export function getInstitutionSourceMetrics() {
  return {
    institutions: PRIORITY_INSTITUTION_SOURCE_PROFILES.length,
    currentProspectuses: PRIORITY_INSTITUTION_SOURCE_PROFILES.filter((profile) => profile.prospectusUrl).length,
    liveWebsitePrimary: PRIORITY_INSTITUTION_SOURCE_PROFILES.filter((profile) => profile.coverage === 'LIVE_WEBSITE_PRIMARY').length,
    accessBlocked: PRIORITY_INSTITUTION_SOURCE_PROFILES.filter((profile) => profile.coverage === 'ACCESS_BLOCKED').length,
    weak: PRIORITY_INSTITUTION_SOURCE_PROFILES.filter((profile) => profile.coverage === 'WEAK').length,
    programmeFinders: PRIORITY_INSTITUTION_SOURCE_PROFILES.filter((profile) => profile.programmeFinderUrl).length,
    exactApplicationLinks: PRIORITY_INSTITUTION_SOURCE_PROFILES.filter((profile) => profile.applicationPortalUrl).length
  }
}
