'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarDays, Upload } from 'lucide-react'
import { formatSemesterRange } from '@/lib/semester-calendar'

interface TimelineEntry {
  label: string
  start: string
  end: string
  phase: string
  weekNumber?: number
}

interface CurrentEntry extends TimelineEntry {}

interface SemesterCalendarPayload {
  ok?: boolean
  source?: 'official' | 'cache' | 'fallback'
  stale?: boolean
  current?: CurrentEntry | null
  timeline?: TimelineEntry[]
}

interface ClassEvent {
  id: string
  title: string
  location?: string | null
  starts_at: string
  ends_at: string
  unit_code?: string | null
  activity_type?: string | null
  is_assessment: boolean
}

export function SemesterTimeline() {
  const [current, setCurrent] = useState<CurrentEntry | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [source, setSource] = useState<'official' | 'cache' | 'fallback' | null>(null)
  const [stale, setStale] = useState(false)
  const [events, setEvents] = useState<ClassEvent[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const loadEvents = async () => {
    try {
      const response = await fetch('/api/calendar-events', { cache: 'no-store' })
      const payload = await response.json()
      if (response.ok && payload?.ok) setEvents(payload.events || [])
    } catch {
      setEvents([])
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/semester-calendar', { cache: 'no-store' })
        const payload = (await response.json()) as SemesterCalendarPayload
        if (!response.ok || !payload?.ok) return

        setCurrent(payload.current || null)
        setTimeline(Array.isArray(payload.timeline) ? payload.timeline : [])
        setSource(payload.source || null)
        setStale(Boolean(payload.stale))
      } catch {
        setCurrent(null)
        setTimeline([])
      }
    }

    void load()
    void loadEvents()
  }, [])

  const importCalendar = async (file?: File) => {
    if (!file) return
    setIsImporting(true)
    setImportMessage(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('/api/calendar-events', { method: 'POST', body: form })
      const payload = await response.json()
      if (!response.ok || !payload?.ok) {
        setImportMessage(payload?.migrationRequired ? 'Calendar storage migration is required before importing.' : payload?.error || 'Timetable import failed.')
        return
      }
      setImportMessage(`${payload.imported} classes imported · ${payload.matched} matched to Units · ${payload.unmatched} need no Unit or manual review.`)
      await loadEvents()
    } finally {
      setIsImporting(false)
    }
  }

  if (!current) {
    return (
      <Card className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Semester timeline</p>
        <p className="text-sm text-slate-600">Add your units and schedule to start tracking the semester timeline.</p>
      </Card>
    )
  }

  const classEvents = events.filter((event) => !event.is_assessment)
  const assessmentEvents = events.filter((event) => event.is_assessment)

  return (
    <div className="space-y-4">
    <Card className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Semester timeline</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">{current.label}</h2>
          <p className="mt-1 text-sm text-slate-600">{formatSemesterRange(current.start, current.end)}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Current period</p>
          <p>{current.phase === 'teaching' ? 'Teaching week' : current.label}</p>
          {source ? <p className="mt-1 text-xs text-slate-500">Source: {source}{stale ? ' (stale cache)' : ''}</p> : null}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-950">Import Class Timetable (.ics)</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">In Allocate+, open your personal timetable, choose Export, select iCalendar (.ics), then upload the downloaded file here.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
            <Upload className="mr-2 h-4 w-4" />{isImporting ? 'Importing...' : 'Choose .ics file'}
            <input type="file" accept=".ics,text/calendar" className="hidden" disabled={isImporting} onChange={(event) => void importCalendar(event.target.files?.[0])} />
          </label>
        </div>
        {importMessage ? <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{importMessage}</p> : null}
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {timeline.map((entry) => {
          const isCurrent = entry.label === current.label
          const isCompleted = timeline.findIndex((item) => item.label === entry.label) < timeline.findIndex((item) => item.label === current.label)
          return (
            <div
              key={entry.label}
              className={`rounded-2xl border p-3 text-sm ${isCurrent ? 'border-sky-300 bg-sky-50' : isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-950">{entry.label}</p>
                {isCurrent ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">Now</span> : null}
              </div>
              <p className="mt-1 text-slate-600">{formatSemesterRange(entry.start, entry.end)}</p>
            </div>
          )
        })}
      </div>
    </Card>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-sky-700" /><h2 className="font-semibold text-slate-950">Actual Classes</h2></div>
        {classEvents.slice(0, 20).map((event) => <div key={event.id} className="border-t border-slate-100 pt-3"><p className="text-sm font-medium text-slate-900">{event.unit_code ? `${event.unit_code} · ` : ''}{event.title}</p><p className="mt-1 text-xs text-slate-500">{new Date(event.starts_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}{event.location ? ` · ${event.location}` : ''}</p></div>)}
        {!classEvents.length ? <p className="text-sm text-slate-600">Import your Allocate+ timetable to see confirmed class times here.</p> : null}
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold text-slate-950">Assessments</h2>
        {assessmentEvents.slice(0, 20).map((event) => <div key={event.id} className="border-t border-slate-100 pt-3"><p className="text-sm font-medium text-slate-900">{event.unit_code ? `${event.unit_code} · ` : ''}{event.title}</p><p className="mt-1 text-xs text-slate-500">{new Date(event.starts_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>)}
        {!assessmentEvents.length ? <p className="text-sm text-slate-600">No assessment events were found in the imported timetable.</p> : null}
      </Card>
    </div>
    </div>
  )
}