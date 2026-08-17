'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
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

export function SemesterTimeline() {
  const [current, setCurrent] = useState<CurrentEntry | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [source, setSource] = useState<'official' | 'cache' | 'fallback' | null>(null)
  const [stale, setStale] = useState(false)

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
  }, [])

  if (!current) {
    return (
      <Card className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Semester timeline</p>
        <p className="text-sm text-slate-600">Add your units and schedule to start tracking the semester timeline.</p>
      </Card>
    )
  }

  return (
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
  )
}