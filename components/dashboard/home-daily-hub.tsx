'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, Clock3, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useGlobalStudy } from '@/components/study/global-study-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { emitAppStateUpdate, onAppStateUpdate } from '@/lib/app-state/client-events'
import { THEMES } from '@/lib/design/themes'

interface DashboardData {
  todayTasks: Array<{ id: string; title: string; due_date?: string | null; planned_date?: string | null; course_code?: string | null; estimated_minutes?: number | null; completed?: number | boolean; task_type?: string | null }>
  upcomingAssessments: Array<{ id: string; name: string; due_date?: string | null; course_code?: string | null; weighting?: number | null; status?: string | null }>
  todayClasses?: Array<{ id: string; title: string; starts_at: string; ends_at: string; location?: string | null; unit_code?: string | null; activity_type?: string | null }>
  currentWeek?: { label: string; start: string; end: string; phase: string; weekNumber?: number | null } | null
  careerPulse?: { activeApplications: number; outstandingAssessments: number; interviews: number; needsAttention: Array<{ title: string; deadline_at_utc: string }> }
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatToday(timezone: string) {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: timezone
  }).format(new Date())
}

function formatTime(value?: string | null, timezone?: string) {
  if (!value) return 'Any time'
  return new Date(value).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || undefined
  })
}

function isCompleted(value?: number | boolean) {
  return value === true || value === 1
}

function assessmentState(assessment: DashboardData['upcomingAssessments'][number]) {
  const completed = assessment.status === 'completed'
  const overdue = !completed && Boolean(assessment.due_date) && new Date(assessment.due_date as string).getTime() < Date.now()
  if (completed) return { label: 'Completed', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
  if (overdue) return { label: 'Overdue', className: 'border-rose-200 bg-rose-50 text-rose-700' }
  return { label: 'Upcoming', className: 'border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]' }
}

export function HomeDailyHub() {
  const { settings } = useAuth()
  const { state: studyState, currentRemainingMs } = useGlobalStudy()
  const timezone = settings.timezone || 'Australia/Melbourne'
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/app-state/dashboard', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (payload?.ok) setDashboard(payload.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
    return onAppStateUpdate(() => {
      void loadDashboard()
    })
  }, [])

  const orderedTasks = useMemo(() => {
    const tasks = [...(dashboard?.todayTasks || [])]
    return tasks.sort((left, right) => {
      if (isCompleted(left.completed) !== isCompleted(right.completed)) return isCompleted(left.completed) ? 1 : -1
      return String(left.planned_date || 'zzzz').localeCompare(String(right.planned_date || 'zzzz'))
    })
  }, [dashboard?.todayTasks])

  const currentTask = useMemo(() => {
    const now = Date.now()
    return orderedTasks.find((task) => {
      if (isCompleted(task.completed) || !task.planned_date) return false
      const start = new Date(task.planned_date).getTime()
      const end = start + Math.max(15, Number(task.estimated_minutes) || 45) * 60000
      return start <= now && now < end
    }) || null
  }, [orderedTasks])

  const nextTasks = useMemo(() => orderedTasks.filter((task) => task.id !== currentTask?.id).slice(0, 4), [currentTask?.id, orderedTasks])
  const completedCount = orderedTasks.filter((task) => isCompleted(task.completed)).length
  const activeTheme = THEMES.find((theme) => theme.id === settings.theme)?.name || 'Oxford'

  const togglePlannerTask = async (taskId: string, completed: boolean) => {
    setDashboard((current) => current ? {
      ...current,
      todayTasks: current.todayTasks.map((task) => task.id === taskId ? { ...task, completed } : task)
    } : current)

    const response = await fetch('/api/app-state/planner-tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, completed })
    })

    if (!response.ok) await loadDashboard()
    emitAppStateUpdate('planner')
  }

  const toggleAssessment = async (assessmentId: string, completed: boolean) => {
    setDashboard((current) => current ? {
      ...current,
      upcomingAssessments: current.upcomingAssessments.map((assessment) => assessment.id === assessmentId ? { ...assessment, status: completed ? 'completed' : 'upcoming' } : assessment)
    } : current)

    const response = await fetch('/api/app-state/assessments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId, completed })
    })

    if (!response.ok) await loadDashboard()
    emitAppStateUpdate('dashboard')
    emitAppStateUpdate('planner')
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Home</p>
          <h1 className="mt-2 text-page-title text-[var(--text-primary)]">{settings.name ? `${settings.name}, here is your day.` : 'What matters today.'}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {formatToday(timezone)}{dashboard?.currentWeek?.label ? ` · ${dashboard.currentWeek.label}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/planner"><Button>Open Planner</Button></Link>
          <Link href="/study"><Button variant="outline">Open MuksFocus</Button></Link>
          <Link href="/settings"><Button variant="outline">Edit Personalisation</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
        <Card className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Today&apos;s plan</p>
              <h2 className="mt-2 text-section-title text-[var(--text-primary)]">{loading ? 'Loading your day…' : orderedTasks.length ? 'Your next commitments and tasks' : 'Your day is still open'}</h2>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              {completedCount} of {orderedTasks.length} complete
            </div>
          </div>

          {currentTask ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-secondary)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Now</p>
              <div className="mt-3 flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => void togglePlannerTask(currentTask.id, !isCompleted(currentTask.completed))}
                  aria-label={`${isCompleted(currentTask.completed) ? 'Mark incomplete' : 'Mark complete'}: ${currentTask.title}`}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${isCompleted(currentTask.completed) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-[var(--border-strong)] bg-[var(--surface)]'}`}
                >
                  {isCompleted(currentTask.completed) ? <Check className="h-4 w-4" /> : null}
                </button>
                <div>
                  <p className={`text-lg font-semibold text-[var(--text-primary)] ${isCompleted(currentTask.completed) ? 'line-through' : ''}`}>{currentTask.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {formatTime(currentTask.planned_date, timezone)}{currentTask.estimated_minutes ? ` · ${Math.round(Number(currentTask.estimated_minutes))} min` : ''}{currentTask.course_code ? ` · ${currentTask.course_code}` : ''}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {nextTasks.slice(0, 5).map((task) => (
              <div key={task.id} className={`flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 ${isCompleted(task.completed) ? 'opacity-60' : ''}`}>
                <button
                  type="button"
                  onClick={() => void togglePlannerTask(task.id, !isCompleted(task.completed))}
                  aria-label={`${isCompleted(task.completed) ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isCompleted(task.completed) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-[var(--border-strong)] bg-[var(--surface)]'}`}
                >
                  {isCompleted(task.completed) ? <Check className="h-3.5 w-3.5" /> : null}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium text-[var(--text-primary)] ${isCompleted(task.completed) ? 'line-through' : ''}`}>{task.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {task.planned_date ? formatTime(task.planned_date, timezone) : 'To do today'}{task.course_code ? ` · ${task.course_code}` : task.task_type ? ` · ${task.task_type.replace('_', ' ')}` : ''}
                  </p>
                </div>
              </div>
            ))}
            {!loading && nextTasks.length === 0 && !currentTask ? <p className="text-sm text-[var(--text-secondary)]">Nothing is scheduled yet. Add your first plan for today.</p> : null}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
            <Link href="/planner"><Button variant="outline">+ Add</Button></Link>
            <Link href="/planner"><Button variant="outline">Open Planner</Button></Link>
            <Link href="/planner"><Button variant="outline"><Sparkles className="mr-2 h-4 w-4" />Plan my day</Button></Link>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">MuksFocus</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{studyState.phase === 'focus' ? 'Focus session' : studyState.phase === 'short_break' ? 'Short break' : 'Long break'}</h2>
              </div>
              <div className="rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                {studyState.status}
              </div>
            </div>
            <p className="font-mono text-4xl font-semibold tracking-tight text-[var(--text-primary)]">{formatRemaining(currentRemainingMs)}</p>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{studyState.activeTaskTitle || 'Choose a study task to begin.'}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{studyState.activeTaskUnitCode || 'General study'} · {studyState.completedFocusCount} completed focus block{studyState.completedFocusCount === 1 ? '' : 's'}</p>
            </div>
            <Link href="/study"><Button variant="outline">Open MuksFocus</Button></Link>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Upcoming assessments</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">What still needs submitting</h2>
            </div>
            <div className="space-y-3">
              {(dashboard?.upcomingAssessments || []).slice(0, 4).map((assessment) => {
                const state = assessmentState(assessment)
                return (
                  <div key={assessment.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{assessment.name}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{assessment.course_code || 'General'}{assessment.weighting ? ` · ${assessment.weighting}%` : ''}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${state.className}`}>{state.label}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-sm text-[var(--text-secondary)]">{assessment.due_date ? `Due ${new Date(assessment.due_date).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Due date not set'}</p>
                      <button type="button" className="text-sm font-semibold text-[var(--accent-strong)]" onClick={() => void toggleAssessment(assessment.id, assessment.status !== 'completed')}>
                        {assessment.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                      </button>
                    </div>
                  </div>
                )
              })}
              {!loading && !(dashboard?.upcomingAssessments || []).length ? <p className="text-sm text-[var(--text-secondary)]">No assessments due yet. Add them in University.</p> : null}
            </div>
            <Link href="/units"><Button variant="outline">Open University</Button></Link>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <Card className="space-y-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Careers</p>
                <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Relevant opportunities</h2>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{dashboard?.careerPulse?.activeApplications || 0} active applications · {dashboard?.careerPulse?.interviews || 0} interviews · {dashboard?.careerPulse?.outstandingAssessments || 0} assessments</p>
              <div className="space-y-2">
                {(dashboard?.careerPulse?.needsAttention || []).slice(0, 2).map((item) => (
                  <p key={`${item.title}-${item.deadline_at_utc}`} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)]">{item.title}</p>
                ))}
                {!dashboard?.careerPulse?.needsAttention?.length ? <p className="text-sm text-[var(--text-secondary)]">Nothing urgent right now.</p> : null}
              </div>
              <Link href="/careers"><Button variant="outline">Open Careers</Button></Link>
            </Card>

            <Card className="space-y-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">My MuksBooks</p>
                <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Your profile at a glance</h2>
              </div>
              <div className="space-y-1 text-sm text-[var(--text-secondary)]">
                <p>{settings.institution || 'Institution not set'}</p>
                <p>{settings.degree || settings.fieldOfStudy || 'Degree not set'}</p>
                <p>{settings.yearLevel ? settings.yearLevel.replace('-', ' ') : 'Year not set'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(settings.careerInterests.length ? settings.careerInterests : settings.academicInterests).slice(0, 4).map((interest) => (
                  <span key={interest} className="rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">{interest}</span>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                <span className="text-[var(--text-muted)]">Theme</span>
                <span className="font-semibold text-[var(--text-primary)]">{activeTheme}</span>
              </div>
              <Link href="/settings"><Button variant="outline">Edit personalisation</Button></Link>
            </Card>
          </div>
        </div>
      </div>

      {dashboard?.todayClasses?.length ? (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[var(--accent-strong)]" />
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Today&apos;s classes</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {dashboard.todayClasses.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                <p className="font-semibold text-[var(--text-primary)]">{item.unit_code ? `${item.unit_code} · ` : ''}{item.title}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{formatTime(item.starts_at, timezone)} - {formatTime(item.ends_at, timezone)}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{item.location || item.activity_type || 'Class'}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </section>
  )
}