'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/components/auth-provider'
import { emitAppStateUpdate, onAppStateUpdate } from '@/lib/app-state/client-events'
import {
  dateKey,
  durationLabel,
  isUntimedTask,
  localDateTime,
  shiftDateKey,
  tasksForDate,
  timeKey,
  timeLabel,
  todayKey,
  type PlannerDraft,
  type PlannerTaskRecord,
  UNTIMED_MARKER
} from '@/lib/planning/day'

interface ClassEvent {
  id: string
  unitCode: string | null
  title: string
  activityType: string | null
  startsAt: string
  endsAt: string
  location: string | null
}

interface Assessment {
  id: string
  unitCode: string | null
  name: string
  assessmentType: string
  dueDate: string | null
  weighting: number | null
  status?: string | null
}

interface Proposal { summary: string; items: PlannerDraft[] }

const EMPTY_FORM = { title: '', courseCode: '', date: '', startTime: '', estimatedMinutes: '60', taskType: 'study', assessmentId: '' }
const AI_EXAMPLES = ['Plan my day', 'Fit in 2 hours of study', 'Plan around my classes', 'Help me finish my assignment', 'Reschedule my unfinished tasks', 'Make tomorrow less busy']
const ASSESSMENT_TYPES = ['Assignment', 'Quiz', 'Test', 'Presentation', 'Report', 'Project', 'Exam', 'Other']

function displayDate(key: string, timezone: string) {
  const today = todayKey(timezone)
  const prefix = key === today ? 'Today · ' : key === shiftDateKey(today, -1) ? 'Yesterday · ' : key === shiftDateKey(today, 1) ? 'Tomorrow · ' : ''
  const date = new Date(`${key}T12:00:00`)
  return `${prefix}${date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}`
}

function eventDateKey(event: ClassEvent, timezone: string) {
  return dateKey(event.startsAt, timezone)
}

function TimelineItem({ task, timezone, onToggle, onEdit, onDelete }: {
  task: PlannerTaskRecord
  timezone: string
  onToggle: (task: PlannerTaskRecord) => void
  onEdit: (task: PlannerTaskRecord) => void
  onDelete: (id: string) => void
}) {
  const completed = Boolean(task.completed)
  const start = timeLabel(task.planned_date, timezone)
  const end = task.planned_date && task.estimated_minutes
    ? timeLabel(new Date(new Date(task.planned_date).getTime() + task.estimated_minutes * 60000).toISOString(), timezone)
    : null
  return <div className={`group grid grid-cols-[4.25rem_2rem_minmax(0,1fr)_auto] items-start gap-3 border-b border-slate-100 py-4 transition-opacity ${completed ? 'opacity-50' : ''}`}>
    <div className="pt-0.5 text-right text-sm font-semibold tabular-nums text-slate-700">{start || ''}</div>
    <button type="button" onClick={() => onToggle(task)} aria-label={`${completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`} className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border transition ${completed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white hover:border-emerald-500'}`}>{completed ? <Check className="h-4 w-4" /> : null}</button>
    <div className="min-w-0">
      <p className={`font-medium text-slate-950 ${completed ? 'line-through' : ''}`}>{task.title}</p>
      <p className="mt-1 text-xs text-slate-500">{[task.course_code, end ? `${start}–${end}` : durationLabel(task.estimated_minutes), task.assessment_id ? 'Assessment work' : null].filter(Boolean).join(' · ') || 'Personal'}</p>
    </div>
    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
      <button onClick={() => onEdit(task)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={`Edit ${task.title}`}><Pencil className="h-4 w-4" /></button>
      <button onClick={() => onDelete(task.id)} className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${task.title}`}><Trash2 className="h-4 w-4" /></button>
    </div>
  </div>
}

export function PlannerManager() {
  const { requireAuth, settings } = useAuth()
  const timezone = settings.timezone || 'Australia/Melbourne'
  const [selectedDate, setSelectedDate] = useState(() => todayKey(timezone))
  const [tasks, setTasks] = useState<PlannerTaskRecord[]>([])
  const [events, setEvents] = useState<ClassEvent[]>([])
  const [courses, setCourses] = useState<string[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, date: selectedDate })
  const [aiOpen, setAiOpen] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [timetableUnit, setTimetableUnit] = useState('')
  const [toolStatus, setToolStatus] = useState('')
  const [assessmentForm, setAssessmentForm] = useState({ unit: '', name: '', type: 'Assignment', dueDate: '', dueTime: '', estimatedHours: '' })

  const loadPlanner = useCallback(async () => {
    setLoading(true)
    try {
      const [tasksResponse, contextResponse, assessmentsResponse] = await Promise.all([
        fetch('/api/app-state/planner-tasks', { cache: 'no-store' }),
        fetch(`/api/app-state/planner-context?date=${encodeURIComponent(selectedDate)}`, { cache: 'no-store' }),
        fetch('/api/app-state/assessments', { cache: 'no-store' })
      ])
      const [taskPayload, contextPayload, assessmentPayload] = await Promise.all([tasksResponse.json(), contextResponse.json(), assessmentsResponse.json()])
      if (taskPayload?.ok) setTasks(taskPayload.tasks || [])
      if (contextPayload?.ok) {
        setCourses((contextPayload.data?.courses || []).map((course: any) => course.course_code).filter(Boolean))
        setEvents((contextPayload.data?.calendarEvents || []).filter((event: any) => !event.isAssessment).map((event: any) => ({ id: event.id, unitCode: event.unitCode || null, title: event.title, activityType: event.activityType, startsAt: event.startsAt, endsAt: event.endsAt, location: event.location })))
      }
      if (assessmentPayload?.ok) setAssessments(assessmentPayload.assessments || [])
    } finally { setLoading(false) }
  }, [selectedDate])

  useEffect(() => {
    void loadPlanner()
    return onAppStateUpdate((type) => { if (['tasks', 'planner', 'courses', 'uploads'].includes(type)) void loadPlanner() })
  }, [loadPlanner])

  const selectedTasks = useMemo(() => tasksForDate(tasks, selectedDate, timezone), [tasks, selectedDate, timezone])
  const selectedEvents = useMemo(() => events.filter((event) => eventDateKey(event, timezone) === selectedDate).sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [events, selectedDate, timezone])
  const timedTasks = selectedTasks.filter((task) => !isUntimedTask(task)).sort((a, b) => String(a.planned_date).localeCompare(String(b.planned_date)))
  const untimedTasks = selectedTasks.filter(isUntimedTask)
  const completed = selectedTasks.filter((task) => Boolean(task.completed)).length
  const unfinishedPast = tasks.filter((task) => !task.completed && task.planned_date && dateKey(task.planned_date, timezone) < todayKey(timezone))
  const selectedAssessments = useMemo(() => {
    const forDay = assessments.filter((assessment) => assessment.dueDate && dateKey(assessment.dueDate, timezone) === selectedDate)
    if (forDay.length) return forDay
    return assessments.filter((assessment) => assessment.status !== 'completed').slice(0, 4)
  }, [assessments, selectedDate, timezone])

  const openCreate = () => { setEditingId(null); setForm({ ...EMPTY_FORM, date: selectedDate }); setFormOpen(true) }
  const openEdit = (task: PlannerTaskRecord) => {
    setEditingId(task.id)
    setForm({ title: task.title, courseCode: task.course_code || '', date: task.planned_date ? dateKey(task.planned_date, timezone) : selectedDate, startTime: task.planned_date && !isUntimedTask(task) ? timeKey(task.planned_date, timezone) : '', estimatedMinutes: String(task.estimated_minutes || 60), taskType: task.task_type || 'study', assessmentId: task.assessment_id || '' })
    setFormOpen(true)
  }

  const saveTask = async (event: React.FormEvent) => {
    event.preventDefault()
    if (requireAuth('Sign in to save your planner.')) return
    const payload = { taskId: editingId || undefined, title: form.title.trim(), description: form.startTime ? null : UNTIMED_MARKER, courseCode: form.courseCode || undefined, plannedDate: localDateTime(form.date, form.startTime || null, timezone), estimatedMinutes: Number(form.estimatedMinutes), taskType: form.taskType, assessmentId: form.assessmentId || null, generatedBy: 'user' }
    const response = await fetch('/api/app-state/planner-tasks', { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!response.ok) return
    setSelectedDate(form.date)
    setFormOpen(false)
    setEditingId(null)
    await loadPlanner()
    emitAppStateUpdate('planner')
  }

  const toggleTask = async (task: PlannerTaskRecord) => {
    const completed = !Boolean(task.completed)
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed } : item))
    const response = await fetch('/api/app-state/planner-tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: task.id, completed }) })
    if (!response.ok) await loadPlanner()
    emitAppStateUpdate('planner')
  }

  const deleteTask = async (id: string) => {
    if (requireAuth('Sign in to manage your planner.')) return
    await fetch(`/api/app-state/planner-tasks?taskId=${encodeURIComponent(id)}`, { method: 'DELETE' })
    setTasks((current) => current.filter((task) => task.id !== id))
    emitAppStateUpdate('planner')
  }

  const askPlanner = async (message = aiInput) => {
    if (!message.trim() || requireAuth('Sign in to use AI planning.')) return
    setAiLoading(true); setAiError(''); setProposal(null)
    const response = await fetch('/api/planner/ai-proposal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, selectedDate }) })
    const payload = await response.json().catch(() => null)
    if (response.ok && payload?.ok) setProposal(payload.proposal)
    else setAiError(payload?.error || 'Could not create a proposal.')
    setAiLoading(false)
  }

  const acceptDrafts = async () => {
    if (!proposal || requireAuth('Sign in to add this proposal.')) return
    const accepted = proposal.items.filter((item) => !item.conflict)
    for (const item of accepted) {
      await fetch('/api/app-state/planner-tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: item.title, description: item.startTime ? null : UNTIMED_MARKER, courseCode: item.courseCode || undefined, plannedDate: localDateTime(item.date, item.startTime, timezone), estimatedMinutes: item.estimatedMinutes, taskType: item.taskType, assessmentId: item.assessmentId, generatedBy: 'planner_ai' }) })
    }
    setProposal(null); setAiOpen(false); setAiInput('')
    await loadPlanner(); emitAppStateUpdate('planner')
  }

  const importTimetable = async (file: File) => {
    const data = new FormData(); data.append('file', file); if (timetableUnit) data.append('unitCode', timetableUnit)
    const response = await fetch('/api/app-state/calendar', { method: 'POST', body: data }); const payload = await response.json()
    setToolStatus(payload?.ok ? `Imported ${payload.imported} class event(s).` : payload?.error || 'Import failed.')
    if (payload?.ok) await loadPlanner()
  }

  const addAssessment = async (event: React.FormEvent) => {
    event.preventDefault()
    const response = await fetch('/api/app-state/assessments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseCode: assessmentForm.unit, name: assessmentForm.name, assessmentType: assessmentForm.type, dueDate: assessmentForm.dueDate, dueTime: assessmentForm.dueTime || undefined, estimatedMinutes: assessmentForm.estimatedHours ? Number(assessmentForm.estimatedHours) * 60 : undefined }) })
    const payload = await response.json(); setToolStatus(payload?.ok ? 'Assessment saved.' : payload?.error || 'Could not save assessment.')
    if (payload?.ok) { setAssessmentForm({ unit: '', name: '', type: 'Assignment', dueDate: '', dueTime: '', estimatedHours: '' }); await loadPlanner() }
  }

  const toggleAssessment = async (assessmentId: string, completed: boolean) => {
    const previous = assessments
    setAssessments((current) => current.map((assessment) => assessment.id === assessmentId ? { ...assessment, status: completed ? 'completed' : 'upcoming' } : assessment))
    const response = await fetch('/api/app-state/assessments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId, completed })
    })
    if (!response.ok) setAssessments(previous)
    emitAppStateUpdate('dashboard')
    emitAppStateUpdate('planner')
  }

  const weekDates = Array.from({ length: 7 }, (_, index) => shiftDateKey(selectedDate, index - 3))

  return <div className="space-y-6">
    <section className="border-b border-slate-200 pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Daily planner</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{displayDate(selectedDate, timezone)}</h2>
          <p className="mt-1 text-sm text-slate-500">{completed} of {selectedTasks.length} complete</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setSelectedDate(shiftDateKey(selectedDate, -1))} className="rounded-md border border-slate-200 p-2 hover:bg-slate-50" aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></button>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(todayKey(timezone))}>Today</Button>
          <label className="relative flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700"><CalendarDays className="h-4 w-4" /><span>Choose date</span><input type="date" value={selectedDate} onChange={(event) => event.target.value && setSelectedDate(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Choose planner date" /></label>
          <button onClick={() => setSelectedDate(shiftDateKey(selectedDate, 1))} className="rounded-md border border-slate-200 p-2 hover:bg-slate-50" aria-label="Next day"><ChevronRight className="h-4 w-4" /></button>
          <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-4 w-4" />Add</Button>
          <Button size="sm" variant="outline" onClick={() => setAiOpen(true)}><Sparkles className="mr-1 h-4 w-4" />Plan my day</Button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-1" aria-label="Week overview">{weekDates.map((key) => { const count = tasksForDate(tasks, key, timezone).length; return <button key={key} onClick={() => setSelectedDate(key)} className={`min-w-0 border-t-2 px-1 py-2 text-center ${key === selectedDate ? 'border-sky-600 text-sky-800' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}><span className="block text-[11px] uppercase">{new Date(`${key}T12:00:00`).toLocaleDateString('en-AU', { weekday: 'short' })}</span><span className="block text-sm font-semibold">{Number(key.slice(-2))}</span><span className="block text-[10px]">{count || '·'}</span></button> })}</div>
    </section>

    {unfinishedPast.length > 0 && selectedDate === todayKey(timezone) ? <div className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm"><span>{unfinishedPast.length} unfinished task{unfinishedPast.length === 1 ? '' : 's'} from earlier days.</span><button className="font-semibold text-amber-900" onClick={() => { setAiOpen(true); setAiInput('Reschedule my unfinished tasks somewhere sensible today.') }}>Reschedule with AI</button></div> : null}

    <section aria-label={`Plan for ${selectedDate}`}>
      {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading your day…</p> : null}
      {!loading && !timedTasks.length && !selectedEvents.length ? <div className="py-10 text-center"><Clock3 className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 font-medium text-slate-800">No timed plans yet</p><button onClick={openCreate} className="mt-2 text-sm font-semibold text-sky-700">Add the first item</button></div> : null}
      <div className="divide-y divide-slate-100">
        {[...selectedEvents.map((event) => ({ kind: 'event' as const, at: event.startsAt, event })), ...timedTasks.map((task) => ({ kind: 'task' as const, at: task.planned_date || '', task }))].sort((a, b) => a.at.localeCompare(b.at)).map((item) => item.kind === 'task' ? <TimelineItem key={`task-${item.task.id}`} task={item.task} timezone={timezone} onToggle={toggleTask} onEdit={openEdit} onDelete={deleteTask} /> : <div key={`event-${item.event.id}`} className="grid grid-cols-[4.25rem_2rem_minmax(0,1fr)] gap-3 py-4"><div className="pt-0.5 text-right text-sm font-semibold tabular-nums text-slate-700">{timeLabel(item.event.startsAt, timezone)}</div><div className="mx-auto h-full w-px bg-slate-300" /><div><p className="font-medium text-slate-950">{item.event.title}</p><p className="mt-1 text-xs text-slate-500">{[item.event.unitCode, item.event.activityType || 'Fixed event', `${timeLabel(item.event.startsAt, timezone)}–${timeLabel(item.event.endsAt, timezone)}`, item.event.location].filter(Boolean).join(' · ')}</p></div></div>)}</div>
    </section>

    <section className="border-t border-slate-200 pt-5"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-slate-950">To do this day</h3><p className="text-xs text-slate-500">Tasks without a fixed time</p></div><button onClick={openCreate} className="text-sm font-semibold text-sky-700">+ Add</button></div><div className="mt-2">{untimedTasks.map((task) => <TimelineItem key={task.id} task={task} timezone={timezone} onToggle={toggleTask} onEdit={openEdit} onDelete={deleteTask} />)}{!untimedTasks.length ? <p className="py-5 text-sm text-slate-500">Nothing else to do.</p> : null}</div></section>

    <section className="border-t border-slate-200 pt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">Assessment deadlines</h3>
          <p className="text-xs text-slate-500">Mark the real assessment complete here without affecting assessment-work study blocks.</p>
        </div>
        <button onClick={() => setToolsOpen(true)} className="text-sm font-semibold text-sky-700">Add assessment</button>
      </div>
      <div className="mt-3 space-y-3">
        {selectedAssessments.map((assessment) => {
          const overdue = assessment.status !== 'completed' && assessment.dueDate && new Date(assessment.dueDate).getTime() < Date.now()
          const completedAssessment = assessment.status === 'completed'
          return (
            <div key={assessment.id} className={`flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between ${completedAssessment ? 'border-emerald-200 bg-emerald-50/70' : overdue ? 'border-rose-200 bg-rose-50/70' : 'border-slate-200 bg-white'}`}>
              <div>
                <p className={`font-medium text-slate-950 ${completedAssessment ? 'line-through' : ''}`}>{assessment.name}</p>
                <p className="mt-1 text-xs text-slate-500">{assessment.unitCode || 'General'} · {assessment.assessmentType}{assessment.weighting ? ` · ${assessment.weighting}%` : ''}{assessment.dueDate ? ` · ${new Date(assessment.dueDate).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</p>
              </div>
              <button type="button" onClick={() => void toggleAssessment(assessment.id, !completedAssessment)} className="text-sm font-semibold text-sky-700">{completedAssessment ? 'Mark incomplete' : overdue ? 'Mark complete' : 'Complete'}</button>
            </div>
          )
        })}
        {!selectedAssessments.length ? <p className="text-sm text-slate-500">No assessment deadlines matched this day yet.</p> : null}
      </div>
    </section>

    <section className="border-t border-slate-200 pt-4"><button onClick={() => setToolsOpen((open) => !open)} className="text-sm font-semibold text-slate-700">{toolsOpen ? 'Hide' : 'Show'} assessments and timetable tools</button>{toolsOpen ? <div className="mt-4 grid gap-6 lg:grid-cols-2"><div><h3 className="font-semibold text-slate-950">Import class timetable</h3><div className="mt-3 flex flex-wrap gap-2"><input value={timetableUnit} onChange={(event) => setTimetableUnit(event.target.value)} placeholder="Unit code" className="h-9 w-32 rounded-md border border-slate-300 px-3 text-sm" /><input type="file" accept=".ics" className="text-sm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importTimetable(file) }} /></div></div><form onSubmit={addAssessment}><h3 className="font-semibold text-slate-950">Add assessment</h3><div className="mt-3 grid gap-2 sm:grid-cols-2"><input required value={assessmentForm.name} onChange={(event) => setAssessmentForm({ ...assessmentForm, name: event.target.value })} placeholder="Assessment name" className="rounded-md border border-slate-300 px-3 py-2 text-sm" /><input required value={assessmentForm.unit} onChange={(event) => setAssessmentForm({ ...assessmentForm, unit: event.target.value })} list="planner-course-options" placeholder="Unit" className="rounded-md border border-slate-300 px-3 py-2 text-sm" /><select value={assessmentForm.type} onChange={(event) => setAssessmentForm({ ...assessmentForm, type: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm">{ASSESSMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select><input required type="date" value={assessmentForm.dueDate} onChange={(event) => setAssessmentForm({ ...assessmentForm, dueDate: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /><input type="time" value={assessmentForm.dueTime} onChange={(event) => setAssessmentForm({ ...assessmentForm, dueTime: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /><input type="number" min="0.25" step="0.25" value={assessmentForm.estimatedHours} onChange={(event) => setAssessmentForm({ ...assessmentForm, estimatedHours: event.target.value })} placeholder="Work hours" className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></div><Button className="mt-3" size="sm" type="submit">Save assessment</Button></form><div className="lg:col-span-2 text-xs text-slate-500">{toolStatus}</div><div className="lg:col-span-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">{assessments.map((assessment) => <span key={assessment.id}>{assessment.unitCode ? `${assessment.unitCode} · ` : ''}{assessment.name}{assessment.dueDate ? ` · ${new Date(assessment.dueDate).toLocaleDateString('en-AU')}` : ''}</span>)}</div></div> : null}</section>

    <datalist id="planner-course-options">{courses.map((course) => <option key={course} value={course} />)}</datalist>

    {formOpen ? <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={editingId ? 'Edit planner item' : 'Add planner item'}><form onSubmit={saveTask} className="w-full max-w-xl rounded-t-lg bg-white p-5 shadow-xl sm:rounded-lg"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-950">{editingId ? 'Edit item' : 'Add to your day'}</h2><button type="button" onClick={() => setFormOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input autoFocus required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What are you doing?" className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2" /><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2" /><label className="text-xs text-slate-500">Start time <span className="text-slate-400">(optional)</span><input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label><label className="text-xs text-slate-500">Duration<input type="number" min="5" max="480" step="5" value={form.estimatedMinutes} onChange={(event) => setForm({ ...form, estimatedMinutes: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label><select value={form.taskType} onChange={(event) => setForm({ ...form, taskType: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="study">Academic</option><option value="personal">Personal</option><option value="fixed">Fixed event</option><option value="assessment_work">Assessment work</option><option value="task">Task</option></select><input value={form.courseCode} onChange={(event) => setForm({ ...form, courseCode: event.target.value })} list="planner-course-options" placeholder="Unit (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" /><select value={form.assessmentId} onChange={(event) => setForm({ ...form, assessmentId: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">No linked assessment</option>{assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.unitCode ? `${assessment.unitCode} · ` : ''}{assessment.name}</option>)}</select></div><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit">{editingId ? 'Save changes' : 'Add item'}</Button></div></form></div> : null}

    {aiOpen ? <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-label="AI Planner"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-white p-5 shadow-xl sm:rounded-lg"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">AI Planner</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Plan {displayDate(selectedDate, timezone).toLowerCase()}</h2></div><button onClick={() => setAiOpen(false)} aria-label="Close AI Planner"><X className="h-5 w-5" /></button></div>{!proposal ? <><div className="mt-4 flex flex-wrap gap-2">{AI_EXAMPLES.map((example) => <button key={example} onClick={() => { setAiInput(example); void askPlanner(example) }} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:border-sky-300">{example}</button>)}</div><textarea value={aiInput} onChange={(event) => setAiInput(event.target.value)} placeholder="Tell MuksBooks what you need to fit into this day…" className="mt-4 min-h-28 w-full rounded-md border border-slate-300 p-3 text-sm" /><div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-slate-500">Nothing changes until you review and add the proposal.</p><Button disabled={aiLoading || !aiInput.trim()} onClick={() => void askPlanner()}>{aiLoading ? 'Planning…' : 'Create proposal'}</Button></div>{aiError ? <p className="mt-3 text-sm text-rose-700">{aiError}</p> : null}</> : <><p className="mt-4 text-sm text-slate-600">{proposal.summary}</p><div className="mt-4 divide-y divide-slate-100">{proposal.items.map((item) => <div key={item.id} className="py-3"><div className="flex justify-between gap-4"><div><p className="font-medium text-slate-950">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.date} · {item.startTime || 'Untimed'} · {durationLabel(item.estimatedMinutes)}{item.courseCode ? ` · ${item.courseCode}` : ''}</p><p className="mt-1 text-xs text-slate-500">{item.rationale}</p>{item.conflict ? <p className="mt-1 text-xs font-medium text-amber-700">Warning: {item.conflict}</p> : null}</div><span className="text-xs font-semibold uppercase text-sky-700">Suggested</span></div></div>)}</div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setProposal(null)}>Adjust</Button><Button variant="outline" onClick={() => { setProposal(null); setAiOpen(false) }}>Cancel</Button><Button disabled={!proposal.items.some((item) => !item.conflict)} onClick={() => void acceptDrafts()}>Add all without conflicts</Button></div></>}</div></div> : null}
  </div>
}
