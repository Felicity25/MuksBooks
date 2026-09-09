'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Card } from '@/components/ui/card'
import { deadlinesForApplication, formatDeadlineDate } from '@/lib/universities/application-domain'
import { getInstitution, getProgramme } from '@/lib/universities/catalog'
import { ADMISSIONS_DEADLINES } from '@/lib/universities/fresh-data'
import { universityStorage } from '@/lib/universities/storage'
import type { UniversityApplication } from '@/lib/universities/types'

export function UniversityPlanningPulse() {
  const { isGuest, settings } = useAuth()
  const [applications, setApplications] = useState<UniversityApplication[]>([])
  useEffect(() => setApplications(isGuest ? universityStorage.getApplications() : settings.universityApplications), [isGuest, settings.universityApplications])

  const actions = useMemo(() => applications.flatMap((application) => {
    const programme = getProgramme(application.programmeId)
    const institution = getInstitution(application.institutionId)
    if (!programme || !institution) return []
    const nextTask = application.tasks.find((task) => !task.completed)
    const nextDeadline = deadlinesForApplication(application, ADMISSIONS_DEADLINES).find((deadline) => new Date(deadline.dueAt).getTime() >= Date.now())
    return [{ application, programme, institution, nextTask, nextDeadline }]
  }).sort((left, right) => String(left.nextTask?.dueAt || left.nextDeadline?.dueAt || 'z').localeCompare(String(right.nextTask?.dueAt || right.nextDeadline?.dueAt || 'z'))).slice(0, 3), [applications])

  return <section aria-labelledby="university-planning-heading">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-sky-700">University planning</p><h2 id="university-planning-heading" className="mt-1 text-xl font-semibold text-slate-950">Your next application actions</h2></div><Link href="/universities/applications" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">Open applications <ArrowRight className="h-4 w-4" /></Link></div>
    {actions.length ? <div className="grid gap-3 lg:grid-cols-3">{actions.map(({ application, programme, institution, nextTask, nextDeadline }) => <Link key={application.id} href={`/universities/applications/${application.id}`}><Card className="h-full p-4 transition-colors hover:border-sky-300"><p className="text-xs font-semibold uppercase text-slate-500">{institution.name}</p><p className="mt-1 font-semibold text-slate-950">{programme.name}</p><p className="mt-3 text-sm text-slate-700">{nextTask?.title || 'Review application requirements'}</p><p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{nextTask?.dueAt ? new Date(nextTask.dueAt).toLocaleDateString('en-AU') : nextDeadline ? `Next verified date ${formatDeadlineDate(nextDeadline)}` : 'No verified date yet'}</p></Card></Link>)}</div> : <Card className="p-5"><p className="text-sm text-slate-600">No applications are being tracked yet. Search by course, shortlist options, then start an application when you are ready.</p><Link href="/universities" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-sky-700">Explore courses <ArrowRight className="h-4 w-4" /></Link></Card>}
  </section>
}
