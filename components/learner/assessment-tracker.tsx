'use client'

import { useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCurriculum } from '@/components/learner/curriculum-context'
import type { LearnerAssessment } from '@/lib/learner/store'

const defaultAssessment: Omit<LearnerAssessment, 'id'> = {
  title: '',
  subject: 'Mathematics: Analysis & Approaches',
  type: 'Assessment',
  dueDate: '',
  dueTime: '',
  status: 'upcoming',
  notes: '',
  weighting: ''
}

const asAssessmentStatus = (value: string): LearnerAssessment['status'] => value === 'completed' ? 'completed' : 'upcoming'

export function AssessmentTracker() {
  const { profile, saveProfile } = useCurriculum()
  const items = profile.assessments
  const [form, setForm] = useState<Omit<LearnerAssessment, 'id'>>(defaultAssessment)

  const persist = (next: LearnerAssessment[]) => void saveProfile({ assessments: next })

  const addAssessment = () => {
    if (!form.title.trim()) return
    const selectedSubject = profile.subjects.find((subject) => subject.id === form.subjectId)
    const next: LearnerAssessment[] = [{ ...form, subject: selectedSubject?.name || form.subject, id: `${Date.now()}`, status: asAssessmentStatus(form.status) } as LearnerAssessment, ...items]
    persist(next)
    setForm(defaultAssessment)
  }

  const toggleCompleted = (id: string) => {
    const next: LearnerAssessment[] = items.map((assessment): LearnerAssessment => assessment.id === id ? { ...assessment, status: assessment.status === 'completed' ? 'upcoming' : 'completed' } : assessment)
    persist(next)
  }

  const deleteAssessment = (id: string) => {
    persist(items.filter((assessment) => assessment.id !== id))
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Assessments</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Tests, assignments, mocks and coursework</h3>
        </div>
        <Button type="button" size="sm" onClick={addAssessment}><Plus className="mr-2 h-4 w-4" />Add</Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Assessment title" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <select value={form.subjectId || ''} onChange={(event) => { const subject = profile.subjects.find((item) => item.id === event.target.value); setForm({ ...form, subjectId: event.target.value || undefined, subject: subject?.name || '' }) }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"><option value="">Select subject</option>{profile.subjects.filter((subject) => subject.active !== false).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
        <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
          {['Test', 'Assignment', 'Mock', 'Internal Assessment', 'Oral', 'Exam', 'Other'].map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <input type="time" value={form.dueTime} onChange={(event) => setForm({ ...form, dueTime: event.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <input value={form.weighting} onChange={(event) => setForm({ ...form, weighting: event.target.value })} placeholder="Weight %" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <div className="md:col-span-2 xl:col-span-3">
          <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes or submission details" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((assessment) => (
          <div key={assessment.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900">{assessment.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${assessment.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white'}`}>{assessment.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{assessment.subject} • {assessment.type} • {assessment.dueDate || 'No date'} {assessment.dueTime ? `at ${assessment.dueTime}` : ''}</p>
              {assessment.notes ? <p className="mt-1 text-xs text-slate-600">{assessment.notes}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => toggleCompleted(assessment.id)}>
                <Check className="mr-2 h-4 w-4" />{assessment.status === 'completed' ? 'Reopen' : 'Done'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => deleteAssessment(assessment.id)} aria-label={`Delete ${assessment.title}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
