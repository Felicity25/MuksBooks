'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpenText, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getLearnerProfile, saveLearnerProfile, type LearnerSubject } from '@/lib/learner/store'

interface SubjectRecord extends LearnerSubject {}

export function SubjectManager() {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([])
  const [form, setForm] = useState({ name: '', level: 'HL' as SubjectRecord['level'], teacher: '', targetGrade: '', predictedGrade: '', currentGrade: '', notes: '' })

  useEffect(() => {
    const profile = getLearnerProfile()
    setSubjects(profile.subjects)
  }, [])

  const persist = (next: SubjectRecord[]) => {
    const profile = getLearnerProfile()
    const saved = saveLearnerProfile({ ...profile, subjects: next, updatedAt: new Date().toISOString() })
    setSubjects(saved.subjects)
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
    if (!form.name.trim()) return

    const next = [{
      id: `${Date.now()}`,
      name: form.name.trim(),
      level: form.level,
      teacher: form.teacher.trim(),
      targetGrade: form.targetGrade.trim(),
      predictedGrade: form.predictedGrade.trim() || form.targetGrade.trim() || '—',
      currentGrade: form.currentGrade.trim() || '—',
      notes: form.notes.trim() || 'No notes yet.'
    }, ...subjects]

    persist(next)
    setForm({ name: '', level: 'HL', teacher: '', targetGrade: '', predictedGrade: '', currentGrade: '', notes: '' })
  }

  const removeSubject = (id: string) => {
    persist(subjects.filter((subject) => subject.id !== id))
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <BookOpenText className="h-4 w-4 text-sky-700" />
          Subject tracker
        </div>
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">Average: {average}</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Subject name" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value as SubjectRecord['level'] })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
          <option value="HL">HL</option>
          <option value="SL">SL</option>
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
      </div>
    </Card>
  )
}
