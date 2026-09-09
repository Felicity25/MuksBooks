'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/components/auth-provider'
import { getInstitution, getProgramme } from '@/lib/universities/catalog'
import { universityStorage } from '@/lib/universities/storage'
import { APPLICATION_STATUSES, createManualUniversityApplication, deadlinesForApplication, formatDeadlineDate } from '@/lib/universities/application-domain'
import { ADMISSIONS_DEADLINES } from '@/lib/universities/fresh-data'
import type { ApplicantType, ApplicationStatus, UniversityApplication } from '@/lib/universities/types'

const label = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())

export default function ApplicationsPage() {
  const { isGuest, settings, saveSettings } = useAuth()
  const [applications, setApplications] = useState<UniversityApplication[]>([])
  const [showManualForm, setShowManualForm] = useState(false)
  const [manual, setManual] = useState({ university: '', programme: '', country: '', intakeYear: new Date().getFullYear() + 1, applicantType: 'UNCERTAIN' as ApplicantType, applicationMethod: '', applicationPortalUrl: '', userDeadline: '' })
  useEffect(() => setApplications(isGuest ? universityStorage.getApplications() : settings.universityApplications), [isGuest, settings.universityApplications])

  const save = (next: UniversityApplication[]) => {
    if (isGuest) universityStorage.saveApplications(next)
    else void saveSettings({ universityApplications: next })
    setApplications(next)
  }

  const update = (id: string, updates: Partial<UniversityApplication>) => save(applications.map((application) => application.id === id ? { ...application, ...updates, updatedAt: new Date().toISOString() } : application))
  const createManual = () => {
    if (!manual.university.trim() || !manual.programme.trim() || !manual.country.trim()) return
    save([...applications, createManualUniversityApplication(manual)])
    setManual({ university: '', programme: '', country: '', intakeYear: new Date().getFullYear() + 1, applicantType: 'UNCERTAIN', applicationMethod: '', applicationPortalUrl: '', userDeadline: '' })
    setShowManualForm(false)
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/universities" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Back to Universities</Link>
      <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold text-slate-950">Applications</h1><p className="mt-2 text-slate-600">Prepare, submit, track decisions and respond to offers from one workspace.</p></div><Button type="button" onClick={() => setShowManualForm((visible) => !visible)} className="gap-2">{showManualForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{showManualForm ? 'Cancel' : 'Add application'}</Button></header>
      {showManualForm ? <section className="border-y border-slate-200 bg-slate-50 px-4 py-5 sm:px-5" aria-labelledby="manual-application-title"><h2 id="manual-application-title" className="text-lg font-semibold text-slate-950">Track an application manually</h2><p className="mt-1 text-sm text-slate-600">Use this when a course is not indexed yet. These details are saved as learner-entered, not official data.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-medium text-slate-700">University<input required value={manual.university} onChange={(event) => setManual({ ...manual, university: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" /></label><label className="text-sm font-medium text-slate-700">Programme<input required value={manual.programme} onChange={(event) => setManual({ ...manual, programme: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" /></label><label className="text-sm font-medium text-slate-700">Country<input required value={manual.country} onChange={(event) => setManual({ ...manual, country: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" /></label><label className="text-sm font-medium text-slate-700">Intake year<input type="number" min="2026" max="2035" value={manual.intakeYear} onChange={(event) => setManual({ ...manual, intakeYear: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" /></label><label className="text-sm font-medium text-slate-700">Applicant type<select value={manual.applicantType} onChange={(event) => setManual({ ...manual, applicantType: event.target.value as ApplicantType })} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option value="UNCERTAIN">Not sure</option><option value="DOMESTIC">Domestic</option><option value="INTERNATIONAL">International</option></select></label><label className="text-sm font-medium text-slate-700">Application method<input value={manual.applicationMethod} onChange={(event) => setManual({ ...manual, applicationMethod: event.target.value })} placeholder="Direct, UCAS, Common App..." className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" /></label><label className="text-sm font-medium text-slate-700">Application URL<input type="url" value={manual.applicationPortalUrl} onChange={(event) => setManual({ ...manual, applicationPortalUrl: event.target.value })} placeholder="https://" className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" /></label><label className="text-sm font-medium text-slate-700">Personal deadline<input type="date" value={manual.userDeadline} onChange={(event) => setManual({ ...manual, userDeadline: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" /></label></div><Button type="button" onClick={createManual} disabled={!manual.university.trim() || !manual.programme.trim() || !manual.country.trim()} className="mt-4">Create application</Button></section> : null}
      {applications.length ? <div className="grid gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Active</p><p className="mt-1 text-2xl font-semibold text-slate-950">{applications.filter((item) => !['ACCEPTED', 'DECLINED', 'REJECTED', 'WITHDRAWN'].includes(item.status)).length}</p></Card><Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Submitted</p><p className="mt-1 text-2xl font-semibold text-slate-950">{applications.filter((item) => ['APPLIED', 'AWAITING_DECISION', 'INTERVIEW_OR_ASSESSMENT'].includes(item.status)).length}</p></Card><Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Offers</p><p className="mt-1 text-2xl font-semibold text-slate-950">{applications.reduce((total, item) => total + item.offers.length, 0)}</p></Card></div> : null}
      {!applications.length ? <Card className="p-6 text-sm text-slate-600">No applications yet. Open a programme and choose “Track application”.</Card> : (
        <div className="space-y-4">{applications.map((application) => {
          const programme = getProgramme(application.programmeId)
          const institution = getInstitution(application.institutionId)
          const programmeName = programme?.name || application.customProgrammeName || 'Untitled programme'
          const institutionName = institution?.name || application.customInstitutionName || 'Unlisted university'
          const country = institution?.country || application.customCountry || 'Country not set'
          const deadlines = deadlinesForApplication(application, ADMISSIONS_DEADLINES)
          const nextDeadline = deadlines.find((deadline) => new Date(deadline.dueAt).getTime() >= Date.now())
          const nextTask = application.tasks.find((task) => !task.completed)
          const latestOffer = application.offers[application.offers.length - 1]
          return <Card key={application.id} className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-950">{programmeName}</h2><span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{application.dataOrigin === 'USER_ENTERED' ? 'Learner entered' : 'Official catalogue'}</span></div><p className="text-sm text-slate-600">{institutionName} • {country} • {application.intakeYear}</p></div><button type="button" onClick={() => save(applications.filter((item) => item.id !== application.id))} aria-label={`Remove ${programmeName} application`} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div>
            <div className="grid gap-3 sm:grid-cols-4"><label className="text-sm font-medium text-slate-700">Status<select value={application.status} onChange={(event) => update(application.id, { status: event.target.value as ApplicationStatus })} className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3">{APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label><div><p className="text-sm font-medium text-slate-700">Next deadline</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-900"><CalendarDays className="h-4 w-4 text-sky-700" />{application.userDeadline ? new Date(`${application.userDeadline}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : nextDeadline ? formatDeadlineDate(nextDeadline) : 'Not verified'}</p></div><div><p className="text-sm font-medium text-slate-700">Next action</p><p className="mt-2 text-sm text-slate-900">{nextTask?.title || 'Review requirements'}</p></div><div><p className="text-sm font-medium text-slate-700">Offer</p><p className="mt-2 text-sm text-slate-900">{latestOffer ? `${label(latestOffer.offerType)} • ${label(latestOffer.status)}` : 'No offer recorded'}</p></div></div>
            <Link href={`/universities/applications/${application.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">Open application <ArrowRight className="h-4 w-4" /></Link>
          </Card>
        })}</div>
      )}
    </main>
  )
}
