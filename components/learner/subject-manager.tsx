'use client'

import { useMemo, useState } from 'react'
import { BookOpenText, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCurriculum } from '@/components/learner/curriculum-context'
import type { LearnerSubject } from '@/lib/learner/store'

interface SubjectRecord extends LearnerSubject {}

export function SubjectManager() {
  const { profile, curriculum, viewingCurriculum, saveProfile } = useCurriculum()
  const subjects = profile.subjects
  const isViewingSavedCurriculum = viewingCurriculum === 'MY' && profile.curriculum === curriculum.id
  const [form, setForm] = useState({ subjectId: '', level: curriculum.levels[0]?.label || '', teacher: '', targetGrade: '', predictedGrade: '', currentGrade: '', notes: '' })

  const persist = async (next: SubjectRecord[]) => {
    await saveProfile({ subjects: next })
  }

  const average = useMemo(() => {
    const numeric = subjects
      .map((subject) => Number(String(subject.currentGrade || '').replace(/[^\d.]/g, '')))
      .filter((value) => Number.isFinite(value))

    if (!numeric.length) return '—'
    const total = numeric.reduce((sum, value) => sum + value, 0)
    return `${(total / numeric.length).toFixed(1)}%`
  }, [subjects])

  const addSubject = () => {
    const curriculumSubject = curriculum.subjects.find((subject) => subject.id === form.subjectId)
    if (!curriculumSubject || subjects.some((subject) => subject.curriculumSubjectCode === curriculumSubject.id)) return

    const next = [{
      id: `${Date.now()}`,
      name: curriculumSubject.title,
      level: form.level,
      curriculumSubjectCode: curriculumSubject.id,
      teacher: form.teacher.trim(),
      targetGrade: form.targetGrade.trim(),
      predictedGrade: form.predictedGrade.trim() || form.targetGrade.trim() || '—',
      currentGrade: form.currentGrade.trim() || '—',
      notes: form.notes.trim() || 'No notes yet.'
    }, ...subjects]

    void persist(next)
    setForm({ subjectId: '', level: curriculum.levels[0]?.label || '', teacher: '', targetGrade: '', predictedGrade: '', currentGrade: '', notes: '' })
  }

  const removeSubject = (id: string) => {
    void persist(subjects.filter((subject) => subject.id !== id))
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <BookOpenText className="h-4 w-4 text-sky-700" />
          My {curriculum.terminology.subject}s
        </div>
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">Average: {average}</span>
      </div>

      {!isViewingSavedCurriculum ? (
        <div className="mt-4">
          <p className="text-sm text-slate-600">You are temporarily viewing {curriculum.shortName}. Your saved subjects have not changed.</p>
          <div className="mt-3 flex flex-wrap gap-2">{curriculum.subjects.map((subject) => <span key={subject.id} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700">{subject.title}</span>)}</div>
        </div>
      ) : <>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <select value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
          <option value="">Select {curriculum.terminology.subject.toLowerCase()}</option>
          {curriculum.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.title}</option>)}
        </select>
        <select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
          {curriculum.levels.map((level) => <option key={level.id} value={level.label}>{level.label}</option>)}
        </select>
        <input value={form.teacher} onChange={(event) => setForm({ ...form, teacher: event.target.value })} placeholder="Teacher (optional)" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <input value={form.targetGrade} onChange={(event) => setForm({ ...form, targetGrade: event.target.value })} placeholder="Target grade" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <input value={form.predictedGrade} onChange={(event) => setForm({ ...form, predictedGrade: event.target.value })} placeholder="Predicted grade" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <input value={form.currentGrade} onChange={(event) => setForm({ ...form, currentGrade: event.target.value })} placeholder="Current grade" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <div className="md:col-span-2 xl:col-span-3">
          <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Teacher comments or focus area" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={addSubject} size="sm"><Plus className="mr-2 h-4 w-4" />Add subject</Button>
      </div>

      <div className="mt-5 space-y-3">
        {subjects.map((subject) => (
          <div key={subject.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900">{subject.name}</p>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">{subject.level}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Teacher: {subject.teacher || 'Not recorded'} • Current: {subject.currentGrade || '—'} • Predicted: {subject.predictedGrade || '—'} • Target: {subject.targetGrade || '—'}</p>
              <p className="mt-1 text-xs text-slate-600">{subject.notes}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeSubject(subject.id)} aria-label={`Remove ${subject.name}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {!subjects.length ? <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">No subjects added yet. Choose your official curriculum subjects above.</p> : null}
      </div>
      </>}
    </Card>
  )
}
