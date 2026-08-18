'use client'

import { Card } from '@/components/ui/card'
import { SectionShell } from '@/components/section-shell'

export default function PomodoroPage() {
  return (
    <SectionShell title="Pomodoro room" description="Persistent focus sessions across the whole app" actionLabel="Open Study Bar">
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Global Study Bar</p>
        <p className="text-sm leading-6 text-slate-600">
          Use the persistent Study bar at the bottom of the screen to pick a Planner task, start/pause/resume/reset a
          focus timer, skip phases, add time, and view today's focused minutes while navigating any page.
        </p>
      </Card>
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Reflection</p>
        <p className="text-sm leading-6 text-slate-600">Completed focus periods are recorded in study history and can be reused by planner and dashboard summaries.</p>
      </Card>
    </SectionShell>
  )
}
