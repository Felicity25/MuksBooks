'use client'

import Link from 'next/link'
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { useGlobalStudy } from '@/components/study/global-study-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function phaseStyles(phase: 'focus' | 'short_break' | 'long_break') {
  if (phase === 'focus') {
    return {
      chip: 'border-[var(--primary)] bg-[var(--primary)] text-white',
      panel: 'border-[var(--border-strong)] bg-[var(--surface-secondary)]'
    }
  }
  if (phase === 'short_break') {
    return {
      chip: 'border-[var(--accent-strong)] bg-[var(--accent-subtle)] text-[var(--accent-strong)]',
      panel: 'border-[var(--border)] bg-[var(--accent-subtle)]'
    }
  }
  return {
    chip: 'border-[var(--border-strong)] bg-[var(--surface-secondary)] text-[var(--text-primary)]',
    panel: 'border-[var(--border)] bg-[var(--surface-secondary)]'
  }
}

export function StudyWorkspace() {
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
    currentRemainingMs
  } = useGlobalStudy()

  const phaseLabel = state.phase === 'focus' ? 'Focus' : state.phase === 'short_break' ? 'Short Break' : 'Long Break'
  const styles = phaseStyles(state.phase)
  const canRun = Boolean(state.activeTaskTitle.trim())

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.75fr]">
      <section className="space-y-6">
        <div className={`rounded-[var(--radius-lg)] border p-6 ${styles.panel}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Focus</p>
              <h1 className="mt-2 text-page-title text-[var(--text-primary)]">MuksFocus</h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">A focused timer that stays with you across MuksBooks while you work through planner tasks, revision, and assessment prep.</p>
            </div>
            <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles.chip}`}>{phaseLabel}</div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <p className="font-mono text-[clamp(4rem,10vw,7rem)] font-semibold leading-none tracking-[-0.04em] text-[var(--text-primary)]">{formatRemaining(currentRemainingMs)}</p>
              <p className="mt-4 text-sm text-[var(--text-secondary)]">{state.status === 'running' ? 'Session in progress' : state.status === 'paused' ? 'Paused and ready to resume' : 'Ready when you are'}</p>
            </div>

            <div className="space-y-4">
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Current task</p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{state.activeTaskTitle || 'Choose a focus target'}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{state.activeTaskUnitCode || 'General study'} · {state.completedFocusCount} completed focus block{state.completedFocusCount === 1 ? '' : 's'}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {state.status === 'idle' ? <Button onClick={start} disabled={!canRun}><Play className="mr-2 h-4 w-4" />Start</Button> : null}
                {state.status === 'running' ? <Button onClick={pause}><Pause className="mr-2 h-4 w-4" />Pause</Button> : null}
                {state.status === 'paused' ? <Button onClick={resume}><Play className="mr-2 h-4 w-4" />Resume</Button> : null}
                <Button variant="outline" onClick={skip}><SkipForward className="mr-2 h-4 w-4" />Skip</Button>
                <Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">What are you studying?</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Link your timer to a planner item or use a custom focus title.</p>
            </div>
            <select
              value={state.activeTaskId || ''}
              onChange={(event) => setActiveTask(event.target.value || null)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="">Custom study task</option>
              {tasks.map((task) => <option key={task.id} value={task.id}>{task.courseCode ? `${task.courseCode} · ` : ''}{task.title}</option>)}
            </select>
            <input
              value={state.activeTaskTitle}
              onChange={(event) => setCustomTaskTitle(event.target.value)}
              placeholder="ETC3400 revision"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
            <Link href="/planner" className="inline-flex text-sm font-semibold text-[var(--accent-strong)]">Open Planner</Link>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Session settings</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Keep the mechanics simple and let the theme carry the tone of each phase.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Focus minutes
                <input type="number" min={5} max={180} value={prefs.focusMinutes} onChange={(event) => updatePrefs({ focusMinutes: Number(event.target.value) || 25 })} className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]" />
              </label>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Short break
                <input type="number" min={1} max={60} value={prefs.shortBreakMinutes} onChange={(event) => updatePrefs({ shortBreakMinutes: Number(event.target.value) || 5 })} className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]" />
              </label>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Long break
                <input type="number" min={1} max={90} value={prefs.longBreakMinutes} onChange={(event) => updatePrefs({ longBreakMinutes: Number(event.target.value) || 20 })} className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]" />
              </label>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Cycles before long break
                <input type="number" min={1} max={12} value={prefs.cycles} onChange={(event) => updatePrefs({ cycles: Number(event.target.value) || 4 })} className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]" />
              </label>
            </div>
          </Card>
        </div>
      </section>

      <aside className="space-y-4">
        <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Today</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Your focus summary</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Focused</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{summary.focusedMinutes} min</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Sessions</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{summary.sessionCount}</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Recent focus history</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Completed sessions stay visible and help your daily summaries.</p>
          </div>
          <div className="space-y-3">
            {recentSessions.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No completed focus sessions yet.</p> : null}
            {recentSessions.map((session) => (
              <div key={session.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="font-semibold text-[var(--text-primary)]">{session.title}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{session.duration_minutes} min · {new Date(session.started_at).toLocaleString('en-AU')}</p>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  )
}