'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, ExternalLink, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Card } from '@/components/ui/card'
import { formatDateInTimezone } from '@/lib/universities/application-domain'
import { getInstitution, getProgramme } from '@/lib/universities/catalog'
import { ADMISSIONS_DEADLINES, CURRICULUM_RESULTS_EVENTS } from '@/lib/universities/fresh-data'
import { FUNDING_DEADLINES, getFundingOpportunity } from '@/lib/universities/funding-data'
import { universityStorage } from '@/lib/universities/storage'
import type { DeadlineType, FundingApplication, UniversityApplication } from '@/lib/universities/types'

type CalendarCategory = 'ALL' | 'APPLICATIONS' | 'FUNDING' | 'DOCUMENTS' | 'TESTS' | 'RESULTS' | 'OFFERS'

const label = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())

function categoryFor(deadlineType: DeadlineType | string): Exclude<CalendarCategory, 'ALL'> {
  if (deadlineType.includes('TEST') || deadlineType.includes('INTERVIEW') || deadlineType.includes('PORTFOLIO')) return 'TESTS'
  if (deadlineType.includes('DOCUMENT') || deadlineType.includes('TRANSCRIPT') || deadlineType.includes('PREDICTED')) return 'DOCUMENTS'
  if (deadlineType.includes('OFFER') || deadlineType.includes('DEPOSIT') || deadlineType.includes('ENROLMENT')) return 'OFFERS'
  if (deadlineType.includes('RESULT')) return 'RESULTS'
  return 'APPLICATIONS'
}

export default function UniversityCalendarPage() {
  const { isGuest, settings } = useAuth()
  const [category, setCategory] = useState<CalendarCategory>('ALL')
  const [country, setCountry] = useState('ALL')
  const [institutionId, setInstitutionId] = useState('ALL')
  const [applicationId, setApplicationId] = useState('ALL')
  const [fundingApplicationId, setFundingApplicationId] = useState('ALL')
  const [applications, setApplications] = useState<UniversityApplication[]>([])
  const [fundingApplications, setFundingApplications] = useState<FundingApplication[]>([])

  useEffect(() => {
    setApplications(isGuest ? universityStorage.getApplications() : settings.universityApplications)
    setFundingApplications(isGuest ? universityStorage.getFundingApplications() : settings.fundingApplications)
  }, [isGuest, settings.fundingApplications, settings.universityApplications])

  const deadlineEvents = ADMISSIONS_DEADLINES.map((deadline) => {
    const institution = getInstitution(deadline.institutionId)
    return { ...deadline, kind: categoryFor(deadline.deadlineType), institutionName: institution?.name || deadline.institutionId, country: institution?.country || '' }
  })
  const resultEvents = CURRICULUM_RESULTS_EVENTS.map((event) => ({ ...event, dueAt: event.dateTime, deadlineType: event.eventType, description: `${event.curriculum} ${event.examSession} ${event.examYear}`, kind: 'RESULTS' as const, institutionId: '', institutionName: 'Curriculum results', country: '', confidenceStatus: event.confidenceStatus }))
  const fundingEvents = FUNDING_DEADLINES.map((deadline) => { const opportunity = getFundingOpportunity(deadline.fundingOpportunityId); return { ...deadline, kind: 'FUNDING' as const, institutionId: deadline.institutionId || '', institutionName: opportunity?.provider || 'Funding provider', country: opportunity?.providerCountry || '', confidenceStatus: deadline.confidenceStatus } })
  const selectedApplication = applications.find((application) => application.id === applicationId)
  const selectedFundingApplication = fundingApplications.find((application) => application.id === fundingApplicationId)
  const events = [...deadlineEvents, ...resultEvents, ...fundingEvents]
    .filter((event) => category === 'ALL' || event.kind === category)
    .filter((event) => country === 'ALL' || event.country === country)
    .filter((event) => institutionId === 'ALL' || event.institutionId === institutionId)
    .filter((event) => !selectedApplication || (event.institutionId === selectedApplication.institutionId && (!('programmeId' in event) || !event.programmeId || event.programmeId === selectedApplication.programmeId) && (!('intakeYear' in event) || event.intakeYear === selectedApplication.intakeYear) && (!('applicantType' in event) || !event.applicantType || !selectedApplication.applicantContext || event.applicantType === selectedApplication.applicantContext.likelyApplicantType) && (!('applicantRoute' in event) || !event.applicantRoute || event.applicantRoute === selectedApplication.applicantRoute)))
    .filter((event) => !selectedFundingApplication || ('fundingOpportunityId' in event && event.fundingOpportunityId === selectedFundingApplication.fundingOpportunityId))
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt))
  const months = Array.from(new Set(events.map((event) => event.dueAt.slice(0, 7))))
  const institutions = Array.from(new Map(deadlineEvents.map((event) => [event.institutionId, { id: event.institutionId, name: event.institutionName, country: event.country }])).values()).sort((left, right) => left.name.localeCompare(right.name))
  const countries = Array.from(new Set(institutions.map((institution) => institution.country).filter(Boolean))).sort()

  return <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/universities" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Universities</Link>
    <header><div className="flex items-center gap-2 text-sm font-semibold uppercase text-sky-700"><CalendarDays className="h-4 w-4" />Planning calendar</div><h1 className="mt-2 text-3xl font-semibold text-slate-950">Applications and results</h1><p className="mt-2 max-w-3xl text-slate-600">A source-backed view of published application milestones, tests and exact curriculum result dates. Dates appear only when the correct cycle, session and year are known.</p></header>
    <Card className="flex gap-3 border-emerald-200 bg-emerald-50 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><p className="font-semibold text-emerald-950">No inferred dates</p><p className="mt-1 text-sm text-emerald-800">Unknown dates stay unknown. Learner-entered personal deadlines remain separate from official published dates.</p></div></Card>
    <section className="grid gap-3 border-y border-slate-200 py-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Calendar filters">
      <label className="text-sm font-medium text-slate-700">Event type<select value={category} onChange={(event) => setCategory(event.target.value as CalendarCategory)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">{(['ALL', 'APPLICATIONS', 'FUNDING', 'DOCUMENTS', 'TESTS', 'RESULTS', 'OFFERS'] as CalendarCategory[]).map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Country<select value={country} onChange={(event) => { setCountry(event.target.value); setInstitutionId('ALL') }} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option value="ALL">All countries</option>{countries.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Institution<select value={institutionId} onChange={(event) => setInstitutionId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option value="ALL">All institutions</option>{institutions.filter((item) => country === 'ALL' || item.country === country).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Tracked application<select value={applicationId} onChange={(event) => { setApplicationId(event.target.value); if (event.target.value !== 'ALL') setFundingApplicationId('ALL') }} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option value="ALL">All applications</option>{applications.map((application) => <option key={application.id} value={application.id}>{getProgramme(application.programmeId)?.name || application.customProgrammeName || 'Untitled programme'} · {getInstitution(application.institutionId)?.name || application.customInstitutionName || 'Unlisted university'}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Tracked funding<select value={fundingApplicationId} onChange={(event) => { setFundingApplicationId(event.target.value); if (event.target.value !== 'ALL') setApplicationId('ALL') }} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option value="ALL">All funding</option>{fundingApplications.map((application) => <option key={application.id} value={application.id}>{application.fundingOpportunityId ? getFundingOpportunity(application.fundingOpportunityId)?.name : application.customOpportunityName || 'Manual opportunity'}</option>)}</select></label>
    </section>
    <div className="space-y-7">{months.map((month) => <section key={month}><h2 className="text-xl font-semibold text-slate-950">{new Date(`${month}-02T12:00:00Z`).toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h2><div className="mt-3 space-y-3">{events.filter((event) => event.dueAt.startsWith(month)).map((event) => <Card key={event.id} className="grid gap-3 p-4 sm:grid-cols-[120px_1fr_auto]"><p className="font-semibold text-slate-950">{formatDateInTimezone(event.dueAt, event.timezone)}</p><div><p className="text-sm font-semibold text-slate-900">{label(event.deadlineType)}</p><p className="mt-1 text-sm text-slate-600">{event.description}</p><p className="mt-1 text-xs text-slate-500">{label(event.kind)}{event.institutionName ? ` • ${event.institutionName}` : ''} • {label(event.confidenceStatus)}</p></div><a href={event.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">Source <ExternalLink className="h-4 w-4" /></a></Card>)}</div></section>)}</div>
    {!events.length ? <Card className="p-6 text-sm text-slate-600">No exact source-backed dates match these filters.</Card> : null}
  </main>
}
