'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/components/auth-provider'
import { useGlobalStudy } from '@/components/study/global-study-provider'
import { useReadAloud } from '@/components/study/read-aloud-provider'

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function GlobalStudyBar() {
  const { user } = useAuth()
  const {
    tasks,
    prefs,
    state,
    summary,
    recentSessions,
    setActiveTask,
    setCustomTaskTitle,
    updatePrefs,
    start,
    pause,
    resume,
    reset,
    skip,
    addMinutes,
    currentRemainingMs
  } = useGlobalStudy()
  const readAloud = useReadAloud()

  const [expanded, setExpanded] = useState(false)
  const [readerText, setReaderText] = useState('')
  const [readerStatus, setReaderStatus] = useState<string | null>(null)

  const canRun = Boolean(state.activeTaskTitle.trim())
  const phaseLabel = state.phase === 'focus' ? 'Focus' : state.phase === 'short_break' ? 'Short break' : 'Long break'
  const phaseTone = state.phase === 'focus'
    ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
    : state.phase === 'short_break'
      ? 'border-[var(--accent-strong)] bg-[var(--accent-subtle)] text-[var(--accent-strong)]'
      : 'border-[var(--border-strong)] bg-[var(--surface-secondary)] text-[var(--text-primary)]'

  const readAloudStatus = useMemo(() => {
    if (readAloud.status === 'idle') return 'Idle'
    if (readAloud.status === 'paused') return 'Paused'
    return `Reading chunk ${readAloud.currentChunkIndex + 1}`
  }, [readAloud.currentChunkIndex, readAloud.status])

  if (!user) return null

  const onReaderFile = async (file?: File) => {
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !['txt', 'md', 'csv'].includes(extension)) {
      setReaderStatus('This file type cannot be safely read aloud yet. Please use .txt, .md or .csv, or paste text.')
      return
    }
    const text = await file.text()
    setReaderText(text)
    setReaderStatus(`Loaded ${file.name}`)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[360px] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl shadow-slate-900/5 backdrop-blur">
      <div className="flex items-start gap-3">
        <span className={`inline-flex min-w-[96px] items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${phaseTone}`} aria-label={`Current phase: ${phaseLabel}`}>
          {phaseLabel}
        </span>
        <div className="min-w-0 flex-1">
          <Link href="/study" className="block truncate text-sm font-semibold text-slate-900 hover:text-[var(--accent-strong)]">{state.activeTaskTitle || 'MuksFocus'}</Link>
          <p className="text-[11px] text-slate-500">{summary.focusedMinutes} min today · {summary.sessionCount} sessions</p>
        </div>
        <p className="w-14 text-right font-mono text-lg font-semibold text-slate-950" aria-live="polite">{formatRemaining(currentRemainingMs)}</p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {state.status === 'running' ? <Button size="sm" onClick={pause} aria-label="Pause timer">Pause</Button> : null}
        {state.status === 'paused' ? <Button size="sm" onClick={resume} aria-label="Resume timer">Resume</Button> : null}
        {state.status === 'idle' ? <Button size="sm" onClick={start} disabled={!canRun} aria-label="Start focus timer">Start</Button> : null}
        <Button size="sm" variant="outline" onClick={() => setExpanded((prev) => !prev)} aria-expanded={expanded} aria-controls="global-study-panel">
          {expanded ? 'Hide' : 'Details'}
        </Button>
      </div>

      {expanded ? (
        <div id="global-study-panel" className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">Planner task
              <select
                value={state.activeTaskId || ''}
                onChange={(event) => {
                  const value = event.target.value || null
                  setActiveTask(value)
                }}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
                aria-label="Select planner task"
              >
                <option value="">Custom task</option>
                {tasks.map((task) => <option key={task.id} value={task.id}>{task.courseCode ? `${task.courseCode} · ` : ''}{task.title}</option>)}
              </select>
            </label>
            <input
              value={state.activeTaskTitle}
              onChange={(event) => setCustomTaskTitle(event.target.value)}
              placeholder="Current focus task"
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
              aria-label="Current task title"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => addMinutes(5)} aria-label="Add five minutes">+5m</Button>
              <Button size="sm" variant="outline" onClick={skip} aria-label="Skip current phase">Skip</Button>
              <Button size="sm" variant="outline" onClick={reset} aria-label="Reset timer">Reset</Button>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={prefs.muted} onChange={(event) => updatePrefs({ muted: event.target.checked })} />Mute bell</label>
            <label className="block text-xs text-slate-600">Bell volume
              <input type="range" min={0} max={1} step={0.05} value={prefs.volume} onChange={(event) => updatePrefs({ volume: Number(event.target.value) })} className="w-full" aria-label="Bell volume" />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  )
}
