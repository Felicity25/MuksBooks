'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCurriculum } from './curriculum-context'
import { getCurriculum, SUPPORTED_CURRICULA, type SupportedCurriculumId } from '@/lib/learner/curriculum-registry'

export function LearnerAcademicProfileSettings() {
  const { profile, saveProfile } = useCurriculum()
  const initialCurriculum = getCurriculum(profile.curriculum)
  const [curriculumId, setCurriculumId] = useState<SupportedCurriculumId>(initialCurriculum.id)
  const [levelId, setLevelId] = useState(initialCurriculum.levels.find((level) => level.label === profile.yearLevel)?.id || initialCurriculum.levels[0]?.id || '')
  const [subjectIds, setSubjectIds] = useState<string[]>(profile.subjects.map((subject) => subject.curriculumSubjectCode).filter((value): value is string => Boolean(value)))
  const [preferredName, setPreferredName] = useState(profile.preferredName)
  const [schoolName, setSchoolName] = useState(profile.school?.name || '')
  const [country, setCountry] = useState(profile.school?.country || '')
  const [graduationYear, setGraduationYear] = useState(profile.expectedGraduationYear)
  const [status, setStatus] = useState('')
  const curriculum = getCurriculum(curriculumId)

  useEffect(() => {
    setPreferredName(profile.preferredName)
    setSchoolName(profile.school?.name || '')
    setCountry(profile.school?.country || '')
    setGraduationYear(profile.expectedGraduationYear)
  }, [profile.expectedGraduationYear, profile.preferredName, profile.school?.country, profile.school?.name])

  const changeCurriculum = (nextId: SupportedCurriculumId) => {
    const next = getCurriculum(nextId)
    setCurriculumId(nextId)
    setLevelId(next.levels[0]?.id || '')
    setSubjectIds([])
  }

  const toggleSubject = (subjectId: string) => {
    setSubjectIds((current) => current.includes(subjectId) ? current.filter((id) => id !== subjectId) : [...current, subjectId])
  }

  const save = async () => {
    setStatus('Saving...')
    const level = curriculum.levels.find((item) => item.id === levelId)
    try {
      await saveProfile({
        preferredName,
        school: { name: schoolName, country, stateRegion: profile.school?.stateRegion || '' },
        curriculum: curriculum.id,
        curriculumLabel: curriculum.shortName,
        yearLevel: level?.label || '',
        expectedGraduationYear: graduationYear,
        subjects: curriculum.subjects.filter((subject) => subjectIds.includes(subject.id)).map((subject) => {
          const existing = profile.subjects.find((item) => item.curriculumSubjectCode === subject.id && profile.curriculum === curriculum.id)
          return existing || { id: `${curriculum.id}-${subject.id}`, name: subject.title, curriculumSubjectCode: subject.id, level: level?.label || '' }
        }),
        onboardingCompleted: true
      })
      setStatus('Learner profile saved.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Learner profile could not be saved.')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Learner academic profile</p>
        <p className="mt-1 text-sm text-slate-600">This profile personalises School and Resources. Viewing another curriculum does not change it.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Preferred name<input value={preferredName} onChange={(event) => setPreferredName(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
        <label className="text-sm font-medium text-slate-700">School<input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
        <label className="text-sm font-medium text-slate-700">Country<input value={country} onChange={(event) => setCountry(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
        <label className="text-sm font-medium text-slate-700">Expected graduation year<input value={graduationYear} onChange={(event) => setGraduationYear(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
        <label className="text-sm font-medium text-slate-700">Curriculum<select value={curriculumId} onChange={(event) => changeCurriculum(event.target.value as SupportedCurriculumId)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">{SUPPORTED_CURRICULA.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">{curriculum.terminology.level}<select value={levelId} onChange={(event) => setLevelId(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">{curriculum.levels.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}</select></label>
      </div>
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">{curriculum.terminology.subject}s</legend>
        <div className="mt-2 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {curriculum.subjects.map((subject) => <label key={subject.id} className={`flex items-center gap-2 rounded-md border p-2.5 text-sm ${subjectIds.includes(subject.id) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}><input type="checkbox" checked={subjectIds.includes(subject.id)} onChange={() => toggleSubject(subject.id)} />{subject.title}</label>)}
        </div>
      </fieldset>
      <div className="flex items-center gap-3"><Button type="button" onClick={() => void save()}>Save learner profile</Button>{status ? <p className="text-sm text-slate-600" role="status">{status}</p> : null}</div>
    </div>
  )
}
