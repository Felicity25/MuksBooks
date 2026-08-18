'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { emitAppStateUpdate, onAppStateUpdate } from '@/lib/app-state/client-events'
import { useAuth } from '@/components/auth-provider'

interface StudySession {
  id: string
  title: string
  unit: string
  window: string
  day: string
  dueDate?: string | null
  taskType?: string | null
  generatedBy?: string | null
}

interface ClassEvent {
  id: string
  unitCode: string | null
  title: string
  activityType: string | null
  startsAt: string
  endsAt: string
  location: string | null
}

interface Recommendation {
  id: string
  unitCode: string | null
  title: string
  detail: string
  kind: string
  sources: string[]
  estimatedMinutes: number
  askTutorHref: string | null
  openDocumentId: string | null
  suggestedTask: { title: string; courseCode: string | null; taskType: string; estimatedMinutes: number; priority: number }
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function PlannerManager() {
  const { requireAuth } = useAuth()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [classEvents, setClassEvents] = useState<ClassEvent[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [courseOptions, setCourseOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSession, setEditingSession] = useState<StudySession | null>(null)
  const [formData, setFormData] = useState({ title: '', unit: '', window: '', day: 'Monday' })
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [timetableUnit, setTimetableUnit] = useState('')
  const [timetableStatus, setTimetableStatus] = useState<string | null>(null)

  const dayNames = DAY_NAMES

  const formatWindow = (plannedDate?: string | null, estimatedMinutes?: number | null) => {
    if (!plannedDate) return 'Flexible block'
    const start = new Date(plannedDate)
    if (Number.isNaN(start.getTime())) return 'Flexible block'
    const end = new Date(start.getTime() + (estimatedMinutes || 60) * 60000)
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`
  }

  const dateFromDay = (day: string, window: string) => {
    const target = dayNames.indexOf(day)
    const now = new Date()
    const date = new Date(now)
    const offset = (target - now.getDay() + 7) % 7
    date.setDate(now.getDate() + offset)

    const [start] = window.split('-').map((part) => part.trim())
    const [hour, minute] = start.split(':').map((part) => Number(part))
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      date.setHours(hour, minute, 0, 0)
    } else {
      date.setHours(9, 0, 0, 0)
    }

    return date.toISOString()
  }

  const durationFromWindow = (window: string) => {
    const [start, end] = window.split('-').map((part) => part.trim())
    if (!start || !end) return 60
    const [sh, sm] = start.split(':').map((part) => Number(part))
    const [eh, em] = end.split(':').map((part) => Number(part))
    if (![sh, sm, eh, em].every(Number.isFinite)) return 60
    const minutes = (eh * 60 + em) - (sh * 60 + sm)
    return minutes > 0 ? minutes : 60
  }

  const loadPlanner = useCallback(async () => {
    setIsLoading(true)
    try {
      const [taskResponse, contextResponse] = await Promise.all([
        fetch('/api/app-state/planner-tasks', { cache: 'no-store' }),
        fetch('/api/app-state/planner-context', { cache: 'no-store' })
      ])

      const taskPayload = await taskResponse.json()
      const contextPayload = await contextResponse.json()

      if (contextPayload?.ok) {
        const codes = (contextPayload.data?.courses || []).map((course: any) => course.course_code).filter(Boolean)
        setCourseOptions(codes)
        setRecommendations(Array.isArray(contextPayload.data?.recommendations) ? contextPayload.data.recommendations : [])

        const events = Array.isArray(contextPayload.data?.calendarEvents) ? contextPayload.data.calendarEvents : []
        setClassEvents(events
          .filter((event: any) => !event.isAssessment)
          .map((event: any) => ({
            id: event.id,
            unitCode: event.unitCode || null,
            title: event.title,
            activityType: event.activityType,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            location: event.location
          })))
      }

      if (taskPayload?.ok) {
        const mapped = (taskPayload.tasks || []).map((task: any) => {
          const plannedDate = task.planned_date || task.due_date || task.created_at
          const date = new Date(plannedDate)
          return {
            id: task.id,
            title: task.title,
            unit: task.course_code || 'General',
            window: formatWindow(plannedDate, task.estimated_minutes),
            day: dayNames[date.getDay()] || 'Monday',
            dueDate: task.due_date,
            taskType: task.task_type,
            generatedBy: task.generated_by
          } as StudySession
        })
        setSessions(mapped)
      }
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void loadPlanner()
    return onAppStateUpdate((updateType) => {
      if (['courses', 'uploads', 'settings', 'tasks', 'planner'].includes(updateType)) {
        void loadPlanner()
      }
    })
  }, [loadPlanner])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (requireAuth('Sign in to save your planner and study sessions.')) return
    const plannedDate = dateFromDay(formData.day, formData.window)
    const estimatedMinutes = durationFromWindow(formData.window)

    if (editingSession) {
      await fetch(`/api/app-state/planner-tasks?taskId=${encodeURIComponent(editingSession.id)}`, {
        method: 'DELETE'
      })
    }

    await fetch('/api/app-state/planner-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formData.title,
        courseCode: formData.unit,
        plannedDate,
        estimatedMinutes,
        taskType: 'study',
        generatedBy: editingSession ? 'user_edit' : 'user'
      })
    })

    await loadPlanner()
    emitAppStateUpdate('planner')
    setEditingSession(null)
    setFormData({ title: '', unit: '', window: '', day: 'Monday' })
    setShowForm(false)
  }

  const handleEdit = (session: StudySession) => {
    if (requireAuth('Sign in to edit your planner.')) return
    setEditingSession(session)
    setFormData({ title: session.title, unit: session.unit, window: session.window, day: session.day })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (requireAuth('Sign in to manage your planner.')) return
    await fetch(`/api/app-state/planner-tasks?taskId=${encodeURIComponent(id)}`, { method: 'DELETE' })
    await loadPlanner()
    emitAppStateUpdate('tasks')
  }

  const handleAcceptRecommendation = async (recommendation: Recommendation) => {
    if (requireAuth('Sign in to add this to your planner.')) return
    await fetch('/api/app-state/planner-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: recommendation.suggestedTask.title,
        courseCode: recommendation.suggestedTask.courseCode,
        estimatedMinutes: recommendation.suggestedTask.estimatedMinutes,
        priority: recommendation.suggestedTask.priority,
        taskType: recommendation.suggestedTask.taskType,
        generatedBy: 'planner_ai'
      })
    })
    setAcceptedIds((prev) => new Set(prev).add(recommendation.id))
    await loadPlanner()
    emitAppStateUpdate('planner')
  }

  const handleOpenContent = async (documentId: string) => {
    const response = await fetch(`/api/app-state/documents/signed-url?documentId=${encodeURIComponent(documentId)}`, { cache: 'no-store' })
    const payload = await response.json()
    if (payload?.ok && payload.url) {
      window.open(payload.url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleImportTimetable = async (file: File) => {
    if (requireAuth('Sign in to import your class timetable.')) return
    setTimetableStatus('Importing…')
    const form = new FormData()
    form.append('file', file)
    if (timetableUnit) form.append('unitCode', timetableUnit)

    const response = await fetch('/api/app-state/calendar', { method: 'POST', body: form })
    const payload = await response.json()
    if (payload?.ok) {
      setTimetableStatus(`Imported ${payload.imported} class event(s).`)
      await loadPlanner()
      emitAppStateUpdate('courses')
    } else {
      setTimetableStatus(payload?.error || 'Could not import this timetable.')
    }
  }

  const generateWeekPlan = async () => {
    if (requireAuth('Sign in to accept suggestions into your planner.')) return
    const pending = recommendations.filter((rec) => !acceptedIds.has(rec.id) && rec.kind !== 'timetable_nudge')
    for (const recommendation of pending) {
      // eslint-disable-next-line no-await-in-loop
      await handleAcceptRecommendation(recommendation)
    }
  }

  const sessionsByDay = sessions.reduce((acc, session) => {
    if (!acc[session.day]) acc[session.day] = []
    acc[session.day].push(session)
    return acc
  }, {} as Record<string, StudySession[]>)

  const weekStart = (() => {
    const now = new Date()
    const monday = new Date(now)
    const offsetFromMonday = (now.getDay() + 6) % 7
    monday.setDate(now.getDate() - offsetFromMonday)
    monday.setHours(0, 0, 0, 0)
    return monday
  })()
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

  const classesByDay = classEvents.reduce((acc, event) => {
    const start = new Date(event.startsAt)
    if (Number.isNaN(start.getTime()) || start < weekStart || start >= weekEnd) return acc
    const dayName = dayNames[start.getDay()]
    if (!acc[dayName]) acc[dayName] = []
    acc[dayName].push(event)
    return acc
  }, {} as Record<string, ClassEvent[]>)

  return (
    <div className="space-y-4">
      {recommendations.length > 0 && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Suggested for you</p>
              <p className="text-xs text-slate-500">Based on your real units, schedule, timetable and uploads.</p>
            </div>
            <Button onClick={generateWeekPlan}>Accept all</Button>
          </div>
          <div className="grid gap-3">
            {recommendations.map((recommendation) => {
              const accepted = acceptedIds.has(recommendation.id)
              return (
                <div key={recommendation.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Suggestion</Badge>
                        {recommendation.unitCode && <Badge>{recommendation.unitCode}</Badge>}
                      </div>
                      <p className="mt-2 font-semibold text-slate-950">{recommendation.title}</p>
                      <p className="text-sm text-slate-600">{recommendation.detail}</p>
                      <details className="mt-2 text-xs text-slate-500">
                        <summary className="cursor-pointer select-none">Why this is here</summary>
                        <ul className="mt-1 list-inside list-disc">
                          {recommendation.sources.map((source, index) => <li key={index}>{source}</li>)}
                        </ul>
                      </details>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      {recommendation.openDocumentId && (
                        <Button size="sm" variant="outline" onClick={() => handleOpenContent(recommendation.openDocumentId as string)}>
                          Open content
                        </Button>
                      )}
                      {recommendation.askTutorHref && (
                        <Button size="sm" variant="outline" onClick={() => window.open(recommendation.askTutorHref as string, '_self')}>
                          Ask tutor
                        </Button>
                      )}
                      {recommendation.kind !== 'timetable_nudge' && (
                        <Button size="sm" disabled={accepted} onClick={() => handleAcceptRecommendation(recommendation)}>
                          {accepted ? 'Added' : 'Add to planner'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Import your class timetable</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Unit (e.g. ETC3420)"
            value={timetableUnit}
            onChange={(e) => setTimetableUnit(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            list="planner-unit-options"
          />
          <input
            type="file"
            accept=".ics"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImportTimetable(file)
              e.target.value = ''
            }}
            className="text-sm"
          />
          {timetableStatus && <span className="text-xs text-slate-500">{timetableStatus}</span>}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Weekly calendar</p>
          <div className="flex gap-2">
            <Button onClick={() => setShowForm(true)}>Add Session</Button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Session title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                list="planner-unit-options"
                required
              />
              <datalist id="planner-unit-options">
                {courseOptions.map((code) => <option key={code} value={code} />)}
              </datalist>
              <input
                type="text"
                placeholder="Time window (e.g., 10:00 - 11:00)"
                value={formData.window}
                onChange={(e) => setFormData({ ...formData, window: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <select
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit">{editingSession ? 'Update' : 'Add'} Session</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingSession(null) }}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="grid gap-4">
          {!isLoading && sessions.length === 0 && classEvents.length === 0 ? <p className="text-sm text-slate-600">No planner tasks or timetable classes yet. Add a session, import your timetable, or accept a suggestion above.</p> : null}
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
            <div key={day} className="space-y-2">
              <h3 className="font-semibold text-slate-950">{day}</h3>
              <div className="space-y-2">
                {(classesByDay[day] || []).map((event) => {
                  const start = new Date(event.startsAt)
                  const end = new Date(event.endsAt)
                  const pad = (value: number) => String(value).padStart(2, '0')
                  const timeLabel = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
                    ? ''
                    : `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`
                  return (
                    <div key={event.id} className="rounded-3xl border border-dashed border-slate-300 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">{event.activityType || 'Class'}{event.unitCode ? ` · ${event.unitCode}` : ''}</p>
                          <p className="text-sm text-slate-600">{event.title}{event.location ? ` · ${event.location}` : ''}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{timeLabel} · Class</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {(sessionsByDay[day] || []).map((session) => (
                  <div key={session.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-950">{session.title}</p>
                          {session.generatedBy === 'planner_ai' && <Badge variant="outline">Suggested</Badge>}
                        </div>
                        <p className="text-sm text-slate-600">{session.unit}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{session.window}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(session)}>Edit</Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(session.id)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
