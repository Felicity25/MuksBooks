import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, Building2, MapPin } from 'lucide-react'
import { notFound } from 'next/navigation'
import { InstitutionProgrammeBrowser } from '@/components/universities/institution-programme-browser'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getInstitution, getInstitutionProgrammes } from '@/lib/universities/catalog'
import { getInstitutionSourceProfile } from '@/lib/universities/source-registry'

export default function InstitutionPage({ params }: { params: { institutionId: string } }) {
  const institution = getInstitution(params.institutionId)
  if (!institution) notFound()
  const programmes = getInstitutionProgrammes(institution.id)
  const sources = getInstitutionSourceProfile(institution.id)

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/universities" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Back to Universities</Link>
      <header className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4" />{institution.city}, {institution.country}</div>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{institution.name}</h1>
        <p className="mt-3 max-w-3xl text-slate-600">{institution.shortSummary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={institution.officialWebsite} target="_blank" rel="noreferrer"><Button type="button" variant="outline" className="gap-2">Official website <ArrowUpRight className="h-4 w-4" /></Button></a>
          {institution.admissionsUrl ? <a href={institution.admissionsUrl} target="_blank" rel="noreferrer"><Button type="button" className="gap-2">Admissions <ArrowUpRight className="h-4 w-4" /></Button></a> : null}
          {institution.programmeFinderUrl ? <a href={institution.programmeFinderUrl} target="_blank" rel="noreferrer"><Button type="button" variant="outline" className="gap-2">Official course finder <ArrowUpRight className="h-4 w-4" /></Button></a> : null}
        </div>
        <p className="mt-3 text-xs text-slate-500">Programme coverage: {institution.programmeCoverageStatus ?? 'building'} • Admissions coverage: {institution.admissionsCoverageStatus ?? 'building'} • Last checked {institution.lastCheckedAt ? new Date(institution.lastCheckedAt).toLocaleDateString('en-AU') : institution.lastVerifiedAt}</p>
      </header>

      {sources ? <section className="border-b border-slate-200 pb-6" aria-labelledby="official-sources-heading"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="official-sources-heading" className="text-xl font-semibold text-slate-950">Official sources</h2><p className="mt-1 text-sm text-slate-600">Current source destinations used to review this institution. Extracted facts remain review-gated.</p></div><span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{sources.coverage.toLowerCase().replace(/_/g, ' ')}</span></div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">{sources.prospectusUrl ? <a href={sources.prospectusUrl} target="_blank" rel="noreferrer" className="font-medium text-sky-700">Undergraduate guide{sources.prospectusAcademicYear ? ` ${sources.prospectusAcademicYear}` : ''}</a> : null}{sources.programmeFinderUrl ? <a href={sources.programmeFinderUrl} target="_blank" rel="noreferrer" className="font-medium text-sky-700">Degree finder</a> : null}{sources.undergraduateAdmissionsUrl ? <a href={sources.undergraduateAdmissionsUrl} target="_blank" rel="noreferrer" className="font-medium text-sky-700">Undergraduate admissions</a> : null}{sources.internationalAdmissionsUrl ? <a href={sources.internationalAdmissionsUrl} target="_blank" rel="noreferrer" className="font-medium text-sky-700">International admissions</a> : null}{sources.applicationPortalUrl ? <a href={sources.applicationPortalUrl} target="_blank" rel="noreferrer" className="font-medium text-sky-700">Application destination</a> : null}{sources.fundingUrl ? <a href={sources.fundingUrl} target="_blank" rel="noreferrer" className="font-medium text-sky-700">Funding information</a> : null}{sources.scholarshipUrl ? <a href={sources.scholarshipUrl} target="_blank" rel="noreferrer" className="font-medium text-sky-700">Scholarships</a> : null}{sources.feesUrl ? <a href={sources.feesUrl} target="_blank" rel="noreferrer" className="font-medium text-sky-700">Fees</a> : null}</div><p className="mt-3 text-xs text-slate-500">Prospectus checked {new Date(sources.lastProspectusCheckAt).toLocaleDateString('en-AU')} • Website sources refreshed {new Date(sources.lastWebsiteRefreshAt).toLocaleDateString('en-AU')}{sources.coverage === 'ACCESS_BLOCKED' ? ' • Automated access was blocked; another review pass is required.' : ''}</p></section> : null}

      <section aria-labelledby="programmes-heading">
        <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-sky-700" /><h2 id="programmes-heading" className="text-2xl font-semibold text-slate-950">Programmes currently indexed</h2></div>
        <p className="mt-1 text-sm text-slate-600">Search {programmes.length} indexed records. Candidate records are identified separately from verified admissions data.</p>
        <div className="mt-4"><InstitutionProgrammeBrowser institution={institution} programmes={programmes} /></div>
      </section>
    </main>
  )
}
