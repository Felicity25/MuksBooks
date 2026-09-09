'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/components/auth-provider'
import { getInstitution, getProgramme } from '@/lib/universities/catalog'
import { universityStorage } from '@/lib/universities/storage'
import type { ApplicationStatus, UniversityApplication } from '@/lib/universities/types'

const STATUSES: ApplicationStatus[] = ['Interested', 'Researching', 'Preparing', 'Applied', 'Offer', 'Accepted', 'Rejected', 'Withdrawn']

export default function ApplicationsPage() {
  const { isGuest, settings, saveSettings } = useAuth()
  const [applications, setApplications] = useState<UniversityApplication[]>([])
  useEffect(() => setApplications(isGuest ? universityStorage.getApplications() : settings.universityApplications), [isGuest, settings.universityApplications])

  const save = (next: UniversityApplication[]) => {
    if (isGuest) universityStorage.saveApplications(next)
    else void saveSettings({ universityApplications: next })
    setApplications(next)
  }

  const update = (id: string, updates: Partial<UniversityApplication>) => save(applications.map((application) => application.id === id ? { ...application, ...updates, updatedAt: new Date().toISOString() } : application))

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/universities" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Back to Universities</Link>
      <header><h1 className="text-3xl font-semibold text-slate-950">Applications</h1><p className="mt-2 text-slate-600">Track your research and application progress. Deadlines are only shown when you add or verify them.</p></header>
      {!applications.length ? <Card className="p-6 text-sm text-slate-600">No applications yet. Open a programme and choose “Track application”.</Card> : (
        <div className="space-y-4">{applications.map((application) => {
          const programme = getProgramme(application.programmeId)
          const institution = getInstitution(application.institutionId)
          if (!programme || !institution) return null
          return <Card key={application.id} className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">{programme.name}</h2><p className="text-sm text-slate-600">{institution.name} • {institution.country}</p></div><button type="button" onClick={() => save(applications.filter((item) => item.id !== application.id))} aria-label={`Remove ${programme.name} application`} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Status<select value={application.status} onChange={(event) => update(application.id, { status: event.target.value as ApplicationStatus })} className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3">{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700">Verified deadline (optional)<input type="date" value={application.deadline ?? ''} onChange={(event) => update(application.id, { deadline: event.target.value })} className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3" /></label>
            </div>
            <label className="block text-sm font-medium text-slate-700">Notes<textarea value={application.notes} onChange={(event) => update(application.id, { notes: event.target.value })} rows={3} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Documents, questions, or next steps" /></label>
            <Link href={`/universities/${institution.id}/${programme.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">View programme <ExternalLink className="h-4 w-4" /></Link>
          </Card>
        })}</div>
      )}
    </main>
  )
}
