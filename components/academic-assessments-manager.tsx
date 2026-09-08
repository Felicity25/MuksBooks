'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { emitAppStateUpdate, onAppStateUpdate } from '@/lib/app-state/client-events'

interface UnitOption {
  id: string
  code: string
  name: string
}

interface AssessmentRecord {
  id: string
  unitId: string | null
  unitCode: string | null
  unitName: string | null
  name: string
  assessmentType: string
  weighting: number | null
  dueDate: string | null
  dueTimeKnown: boolean
  estimatedMinutes: number | null
  notes: string | null
  status: string
}

const ASSESSMENT_TYPES = ['Assignment', 'Quiz', 'Test', 'Presentation', 'Report', 'Project', 'Exam', 'Other']

function isOverdue(assessment: AssessmentRecord) {
  return assessment.status !== 'completed' && Boolean(assessment.dueDate) && new Date(assessment.dueDate as string).getTime() < Date.now()
}

export function AcademicAssessmentsManager() {
  const { requireAuth } = useAuth()
  const [units, setUnits] = useState<UnitOption[]>([])
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([])
  const [selectedUnit, setSelectedUnit] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ courseCode: '', name: '', assessmentType: 'Assignment', dueDate: '', dueTime: '', weighting: '', estimatedHours: '', notes: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [unitsResponse, assessmentsResponse] = await Promise.all([
        fetch('/api/app-state/courses', { cache: 'no-store' }),
        fetch('/api/app-state/assessments', { cache: 'no-store' })
      ])
      const [unitsPayload, assessmentsPayload] = await Promise.all([
        unitsResponse.json().catch(() => null),
        assessmentsResponse.json().catch(() => null)
      ])
      if (unitsPayload?.ok) {
        const mapped = (unitsPayload.courses || []).map((course: any) => ({ id: course.id, code: course.course_code, name: course.course_name || course.course_code }))
        setUnits(mapped)
        setForm((current) => ({ ...current, courseCode: current.courseCode || mapped[0]?.code || '' }))
      }
      if (assessmentsPayload?.ok) setAssessments(assessmentsPayload.assessments || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    return onAppStateUpdate((type) => {
      if (['courses', 'planner', 'dashboard'].includes(type)) void load()
    })
  }, [])

  const visibleAssessments = useMemo(() => {
    const filtered = selectedUnit === 'all' ? assessments : assessments.filter((assessment) => assessment.unitCode === selectedUnit)
    return [...filtered].sort((left, right) => String(left.dueDate || 'zzzz').localeCompare(String(right.dueDate || 'zzzz')))
  }, [assessments, selectedUnit])

  const saveAssessment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (requireAuth('Sign in to manage your academic assessments.')) return
    setMessage('')

    const response = await fetch('/api/app-state/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseCode: form.courseCode,
        name: form.name,
        assessmentType: form.assessmentType,
        dueDate: form.dueDate,
        dueTime: form.dueTime || undefined,
        weighting: form.weighting ? Number(form.weighting) : undefined,
        estimatedMinutes: form.estimatedHours ? Number(form.estimatedHours) * 60 : undefined,
        notes: form.notes || undefined
      })
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.ok) {
      setMessage(payload?.error || 'Assessment could not be saved.')
      return
    }

    setForm({ courseCode: form.courseCode, name: '', assessmentType: 'Assignment', dueDate: '', dueTime: '', weighting: '', estimatedHours: '', notes: '' })
    setShowForm(false)
    setMessage('Assessment saved.')
    await load()
    emitAppStateUpdate('dashboard')
    emitAppStateUpdate('planner')
  }

  const toggleComplete = async (assessmentId: string, completed: boolean) => {
    if (requireAuth('Sign in to manage your academic assessments.')) return
    setAssessments((current) => current.map((assessment) => assessment.id === assessmentId ? { ...assessment, status: completed ? 'completed' : 'upcoming' } : assessment))
    const response = await fetch('/api/app-state/assessments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId, completed })
    })
    if (!response.ok) await load()
    emitAppStateUpdate('dashboard')
    emitAppStateUpdate('planner')
  }

  const deleteAssessment = async (assessmentId: string) => {
    if (requireAuth('Sign in to manage your academic assessments.')) return
    const response = await fetch(`/api/app-state/assessments?assessmentId=${encodeURIComponent(assessmentId)}`, { method: 'DELETE' })
    if (!response.ok) return
    setAssessments((current) => current.filter((assessment) => assessment.id !== assessmentId))
    emitAppStateUpdate('dashboard')
    emitAppStateUpdate('planner')
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Assessments</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Add and track work by unit</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">One assessment record persists across Home, Planner, and University.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={selectedUnit} onChange={(event) => setSelectedUnit(event.target.value)} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]">
            <option value="all">All units</option>
            {units.map((unit) => <option key={unit.id} value={unit.code}>{unit.code}</option>)}
          </select>
          <Button onClick={() => setShowForm((value) => !value)}><Plus className="mr-2 h-4 w-4" />Add assessment</Button>
        </div>
      </div>

      {message ? <p className="rounded-md border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)]">{message}</p> : null}

      {showForm ? (
        <form onSubmit={saveAssessment} className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4 sm:grid-cols-2">
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Assessment title" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] sm:col-span-2" />
          <select required value={form.courseCode} onChange={(event) => setForm({ ...form, courseCode: event.target.value })} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]">
            <option value="">Select unit</option>
            {units.map((unit) => <option key={unit.id} value={unit.code}>{unit.code}</option>)}
          </select>
          <select value={form.assessmentType} onChange={(event) => setForm({ ...form, assessmentType: event.target.value })} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]">
            {ASSESSMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]" />
          <input type="time" value={form.dueTime} onChange={(event) => setForm({ ...form, dueTime: event.target.value })} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]" />
          <input type="number" min="0" step="1" value={form.weighting} onChange={(event) => setForm({ ...form, weighting: event.target.value })} placeholder="Weight %" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]" />
          <input type="number" min="0" step="0.5" value={form.estimatedHours} onChange={(event) => setForm({ ...form, estimatedHours: event.target.value })} placeholder="Estimated hours" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]" />
          <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes or submission details" className="min-h-24 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] sm:col-span-2" />
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Save assessment</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      ) : null}

      <div className="space-y-3">
        {!loading && visibleAssessments.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No assessments yet. Add the first due item for this unit.</p> : null}
        {visibleAssessments.map((assessment) => {
          const overdue = isOverdue(assessment)
          const completed = assessment.status === 'completed'
          return (
            <div key={assessment.id} className={`rounded-[var(--radius-lg)] border p-4 ${completed ? 'border-emerald-200 bg-emerald-50/70' : overdue ? 'border-rose-200 bg-rose-50/70' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-semibold text-[var(--text-primary)] ${completed ? 'line-through' : ''}`}>{assessment.name}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${completed ? 'bg-emerald-100 text-emerald-700' : overdue ? 'bg-rose-100 text-rose-700' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'}`}>{completed ? 'Completed' : overdue ? 'Overdue' : 'Upcoming'}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{assessment.unitCode || 'General'} · {assessment.assessmentType}{assessment.weighting ? ` · ${assessment.weighting}%` : ''}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{assessment.dueDate ? `Due ${new Date(assessment.dueDate).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: assessment.dueTimeKnown ? 'short' : undefined })}` : 'Due date not set'}</p>
                  {assessment.notes ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{assessment.notes}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void toggleComplete(assessment.id, !completed)}>
                    <Check className="mr-2 h-4 w-4" />{completed ? 'Mark incomplete' : 'Mark complete'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void deleteAssessment(assessment.id)}>
                    <X className="mr-2 h-4 w-4" />Delete
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}