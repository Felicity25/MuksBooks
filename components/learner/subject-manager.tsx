'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { BookOpenText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCurriculum } from '@/components/learner/curriculum-context'
import { CurriculumSubjectPicker } from '@/components/learner/curriculum-subject-picker'
import { mergeLearnerSubjects, type LearnerSubject } from '@/lib/learner/store'

interface SubjectRecord extends LearnerSubject {}

export function SubjectManager() {
  const { profile, curriculum, viewingCurriculum, saveProfile } = useCurriculum()
  const subjects = profile.subjects.filter((subject) => subject.active !== false)
  const selectedSubjects = subjects.filter((subject) => subject.curriculumId === curriculum.id)
  const isViewingSavedCurriculum = viewingCurriculum === 'MY' && profile.curriculum === curriculum.id

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

  const updateSelection = (next: LearnerSubject[]) => {
    void persist(mergeLearnerSubjects(profile.subjects, next, curriculum.id))
  }

  const removeSubject = (id: string) => {
    updateSelection(selectedSubjects.filter((subject) => subject.id !== id))
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
      <div className="mt-4"><CurriculumSubjectPicker curriculumId={curriculum.id} value={selectedSubjects} onChange={updateSelection} /></div>

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
            <div className="flex shrink-0 items-center gap-1">
              <Link href={`/school/subjects/${encodeURIComponent(subject.id)}`} className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-sky-700 hover:bg-sky-50">Open</Link>
              <Link href={`/school/subjects/${encodeURIComponent(subject.id)}?edit=1`} className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100">Edit</Link>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeSubject(subject.id)} aria-label={`Remove ${subject.name}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {!subjects.length ? <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">No subjects added yet. Choose your official curriculum subjects above.</p> : null}
      </div>
      </>}
    </Card>
  )
}
