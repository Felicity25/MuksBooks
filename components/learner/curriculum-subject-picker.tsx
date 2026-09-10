'use client'

import { useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAvailableSubjectLevels, getCommonCurriculumSubjects, getCurriculum, searchCurriculumSubjects, type CurriculumSubject, type SupportedCurriculumId } from '@/lib/learner/curriculum-registry'
import type { LearnerSubject } from '@/lib/learner/store'
import { stableLearnerSubjectId } from '@/lib/academic-context'

interface CurriculumSubjectPickerProps {
  curriculumId: SupportedCurriculumId
  value: LearnerSubject[]
  onChange: (subjects: LearnerSubject[]) => void
  defaultLevelId?: string
}

function namedSubjectTitle(subject: CurriculumSubject, manualName: string) {
  const name = manualName.trim()
  if (!name) return subject.title
  if (subject.title.startsWith('Language A:')) return `${name} A:${subject.title.split(':')[1]}`
  if (subject.title === 'Language B') return `${name} B`
  if (subject.title === 'Language ab initio') return `${name} ab initio`
  if (subject.title === 'Classical languages' || subject.title === 'Foreign Language' || subject.title === 'Languages') return name
  return `${name} ${subject.title.toLowerCase()}`
}

export function CurriculumSubjectPicker({ curriculumId, value, onChange, defaultLevelId }: CurriculumSubjectPickerProps) {
  const curriculum = getCurriculum(curriculumId)
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [subjectNames, setSubjectNames] = useState<Record<string, string>>({})
  const [customName, setCustomName] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [showManual, setShowManual] = useState(false)

  const visibleSubjects = useMemo(() => query.trim()
    ? searchCurriculumSubjects(curriculumId, query)
    : showAll ? curriculum.subjects : getCommonCurriculumSubjects(curriculumId), [curriculum.subjects, curriculumId, query, showAll])
  const groupedSubjects = useMemo(() => Object.entries(visibleSubjects.reduce<Record<string, CurriculumSubject[]>>((groups, subject) => {
    ;(groups[subject.group] ||= []).push(subject)
    return groups
  }, {})), [visibleSubjects])

  const selectedFor = (subjectId: string) => value.find((subject) => subject.provenance === 'CATALOGUE' && subject.curriculumSubjectCode === subjectId)

  const addCatalogueSubject = (subject: CurriculumSubject) => {
    if (selectedFor(subject.id)) return
    const levels = getAvailableSubjectLevels(curriculumId, subject.id)
    const level = levels.find((item) => item.id === defaultLevelId) || levels[0]
    const manualName = subjectNames[subject.id] || ''
    if (subject.manualNameLabel && !manualName.trim()) return
    onChange([...value, {
      id: stableLearnerSubjectId(curriculumId, subject.id, namedSubjectTitle(subject, manualName)),
      name: namedSubjectTitle(subject, manualName),
      provenance: 'CATALOGUE',
      curriculumId,
      curriculumSubjectCode: subject.id,
      levelId: level?.id || '',
      level: level?.shortLabel || '',
      active: true
    }])
  }

  const removeSubject = (id: string) => onChange(value.filter((subject) => subject.id !== id))
  const changeLevel = (id: string, levelId: string) => {
    const level = curriculum.levels.find((item) => item.id === levelId)
    onChange(value.map((subject) => subject.id === id ? { ...subject, levelId, level: level?.shortLabel || level?.label || '' } : subject))
  }
  const addCustomSubject = () => {
    if (!customName.trim()) return
    const level = curriculum.levels.find((item) => item.id === defaultLevelId) || curriculum.levels[0]
    onChange([...value, {
      id: stableLearnerSubjectId(curriculumId, undefined, customName.trim()),
      name: customName.trim(),
      provenance: 'CUSTOM',
      curriculumId,
      levelId: level?.id || '',
      level: level?.shortLabel || '',
      description: customDescription.trim(),
      active: true
    }])
    setCustomName('')
    setCustomDescription('')
    setShowManual(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${curriculum.subjects.length} ${curriculum.terminology.subject.toLowerCase()}s`} className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900" />
        </label>
        <Button type="button" variant="outline" onClick={() => setShowAll((current) => !current)}>{showAll ? 'Common subjects' : `View all (${curriculum.subjects.length})`}</Button>
        <Button type="button" variant="outline" onClick={() => setShowManual((current) => !current)}><Plus className="mr-2 h-4 w-4" />Manual subject</Button>
      </div>

      {showManual ? <div className="grid gap-2 border-l-2 border-sky-600 pl-3 sm:grid-cols-2">
        <input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Subject name" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
        <input value={customDescription} onChange={(event) => setCustomDescription(event.target.value)} placeholder="Description (optional)" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
        <div className="sm:col-span-2"><Button type="button" size="sm" onClick={addCustomSubject} disabled={!customName.trim()}>Add manual subject</Button></div>
      </div> : null}

      <div className="max-h-80 space-y-4 overflow-y-auto border-y border-slate-200 py-3">
        {groupedSubjects.map(([group, groupSubjects]) => <section key={group}>
          <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">{group}</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {groupSubjects.map((subject) => {
              const selected = selectedFor(subject.id)
              const manualName = subjectNames[subject.id] || ''
              return <div key={subject.id} className={`border p-2.5 ${selected ? 'border-sky-700 bg-sky-50' : 'border-slate-200 bg-white'}`}>
                <label className="flex items-start gap-2 text-sm text-slate-800">
                  <input type="checkbox" checked={Boolean(selected)} onChange={() => selected ? removeSubject(selected.id) : addCatalogueSubject(subject)} disabled={Boolean(subject.manualNameLabel && !manualName.trim() && !selected)} className="mt-0.5" />
                  <span>{subject.title}{subject.syllabusCode ? <span className="ml-1 text-xs text-slate-500">({subject.syllabusCode})</span> : null}</span>
                </label>
                {subject.manualNameLabel && !selected ? <input value={manualName} onChange={(event) => setSubjectNames({ ...subjectNames, [subject.id]: event.target.value })} placeholder={`${subject.manualNameLabel}, e.g. French`} className="mt-2 w-full rounded border border-slate-300 px-2 py-1.5 text-xs" /> : null}
              </div>
            })}
          </div>
        </section>)}
        {!visibleSubjects.length ? <p className="py-4 text-sm text-slate-600">No subjects match “{query}”. Add it as a manual subject instead.</p> : null}
      </div>

      {value.length ? <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-slate-500">Selected ({value.length})</p>
        {value.map((subject) => {
          const levels = subject.provenance === 'CATALOGUE' && subject.curriculumSubjectCode ? getAvailableSubjectLevels(curriculumId, subject.curriculumSubjectCode) : curriculum.levels
          return <div key={subject.id} className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-sm">
            <span className="min-w-0 flex-1 font-medium text-slate-900">{subject.name}</span>
            {levels.length ? <select value={subject.levelId || levels[0]?.id || ''} onChange={(event) => changeLevel(subject.id, event.target.value)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs">{levels.map((level) => <option key={level.id} value={level.id}>{level.shortLabel}</option>)}</select> : <span className="text-xs text-slate-500">Core</span>}
            <button type="button" onClick={() => removeSubject(subject.id)} aria-label={`Remove ${subject.name}`} className="p-1 text-slate-500 hover:text-red-700"><X className="h-4 w-4" /></button>
          </div>
        })}
      </div> : null}
    </div>
  )
}