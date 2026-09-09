import Link from 'next/link'
import { ArrowLeft, CalendarDays, ExternalLink, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatDateInTimezone } from '@/lib/universities/application-domain'
import { ADMISSIONS_DEADLINES, CURRICULUM_RESULTS_EVENTS } from '@/lib/universities/fresh-data'

const label = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())

export default function UniversityCalendarPage() {
  const uniqueDeadlines = Array.from(new Map(ADMISSIONS_DEADLINES.map((deadline) => [`${deadline.dueAt}-${deadline.deadlineType}-${deadline.description}`, deadline])).values())
  const events = [...uniqueDeadlines.map((deadline) => ({ ...deadline, kind: 'Application' as const })), ...CURRICULUM_RESULTS_EVENTS.map((event) => ({ ...event, id: event.id, dueAt: event.dateTime, deadlineType: event.eventType, description: `${event.curriculum} ${event.examSession} ${event.examYear}`, kind: 'Results' as const, confidenceStatus: event.confidenceStatus }))].sort((left, right) => left.dueAt.localeCompare(right.dueAt))
  const months = Array.from(new Set(events.map((event) => event.dueAt.slice(0, 7))))

  return <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/universities" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Universities</Link>
    <header><div className="flex items-center gap-2 text-sm font-semibold uppercase text-sky-700"><CalendarDays className="h-4 w-4" />Planning calendar</div><h1 className="mt-2 text-3xl font-semibold text-slate-950">Applications and results</h1><p className="mt-2 max-w-3xl text-slate-600">A source-backed view of published application milestones and exact curriculum result dates. Dates are only added when the correct cycle, session and year are known.</p></header>
    <Card className="flex gap-3 border-emerald-200 bg-emerald-50 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><p className="font-semibold text-emerald-950">No inferred dates</p><p className="mt-1 text-sm text-emerald-800">The IB has not published an exact future results release date in the checked official source, so no date is displayed or added to Planner.</p></div></Card>
    <div className="space-y-7">{months.map((month) => <section key={month}><h2 className="text-xl font-semibold text-slate-950">{new Date(`${month}-02T12:00:00Z`).toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h2><div className="mt-3 space-y-3">{events.filter((event) => event.dueAt.startsWith(month)).map((event) => <Card key={event.id} className="grid gap-3 p-4 sm:grid-cols-[120px_1fr_auto]"><p className="font-semibold text-slate-950">{formatDateInTimezone(event.dueAt, event.timezone)}</p><div><p className="text-sm font-semibold text-slate-900">{label(event.deadlineType)}</p><p className="mt-1 text-sm text-slate-600">{event.description}</p><p className="mt-1 text-xs text-slate-500">{event.kind} • {label(event.confidenceStatus)}</p></div><a href={event.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">Source <ExternalLink className="h-4 w-4" /></a></Card>)}</div></section>)}</div>
    {!events.length ? <Card className="p-6 text-sm text-slate-600">No exact source-backed dates are available yet.</Card> : null}
  </main>
}
