'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SectionShell } from '@/components/section-shell'

export default function PomodoroPage() {
  const [seconds, setSeconds] = useState(1500)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setSeconds((prev) => Math.max(prev - 1, 0)), 1000)
    return () => window.clearInterval(timer)
  }, [running])

  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  return (
    <SectionShell title="Pomodoro room" description="Focus sessions linked to unit and topic" actionLabel="Start session">
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Timer</p>
        <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div>
            <p className="text-4xl font-semibold text-slate-950">{minutes}:{remainder.toString().padStart(2, '0')}</p>
            <p className="mt-2 text-sm text-slate-600">Standard Pomodoro with reflection prompts after each session.</p>
          </div>
          <Button onClick={() => setRunning((prev) => !prev)}>{running ? 'Pause' : 'Start'}</Button>
        </div>
      </Card>
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Reflection</p>
        <p className="text-sm leading-6 text-slate-600">At the end of each session, note what you learned, what needs review, and the next exam-style question to practise.</p>
      </Card>
    </SectionShell>
  )
}
