'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { emitAppStateUpdate } from '@/lib/app-state/client-events'
import { useAuth } from '@/components/auth-provider'

interface StudySession {
  id: string
  title: string
  unit: string
  window: string
  day: string
  dueDate?: string | null
  taskType?: string | null
}

export function PlannerManager() {
  const { requireAuth } = useAuth()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [courseOptions, setCourseOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSession, setEditingSession] = useState<StudySession | null>(null)
  const [formData, setFormData] = useState({ title: '', unit: '', window: '', day: 'Monday' })

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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

  const loadPlanner = async () => {
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
            taskType: task.task_type
          } as StudySession
        })
        setSessions(mapped)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPlanner()
  }, [])

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

  const generateWeekPlan = async () => {
    if (requireAuth('Sign in to generate and save a personalised week plan.')) return
    const units = courseOptions.length ? courseOptions : ['ETC3430', 'ETC3460', 'BFF5926', 'ETC5512']
    const activities = ['Quiz practice', 'Assignment work', 'Lesson review', 'Problem solving', 'Exam prep']
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const times = ['09:00 - 10:00', '14:00 - 15:00', '17:00 - 18:00']

    for (let i = 0; i < 5; i++) {
      const window = times[Math.floor(Math.random() * times.length)]
      await fetch('/api/app-state/planner-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activities[Math.floor(Math.random() * activities.length)],
          courseCode: units[Math.floor(Math.random() * units.length)],
          plannedDate: dateFromDay(days[i], window),
          estimatedMinutes: durationFromWindow(window),
          taskType: 'study',
          generatedBy: 'planner_ai'
        })
      })
    }

    await loadPlanner()
    emitAppStateUpdate('planner')
  }

  const sessionsByDay = sessions.reduce((acc, session) => {
    if (!acc[session.day]) acc[session.day] = []
    acc[session.day].push(session)
    return acc
  }, {} as Record<string, StudySession[]>)

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Weekly calendar</p>
          <div className="flex gap-2">
            <Button onClick={() => setShowForm(true)}>Add Session</Button>
            <Button onClick={generateWeekPlan}>Plan My Week</Button>
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
          {!isLoading && sessions.length === 0 ? <p className="text-sm text-slate-600">No planner tasks yet. Add one or generate your week.</p> : null}
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
            <div key={day} className="space-y-2">
              <h3 className="font-semibold text-slate-950">{day}</h3>
              <div className="space-y-2">
                {(sessionsByDay[day] || []).map((session) => (
                  <div key={session.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{session.title}</p>
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