'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCurriculum } from './curriculum-context'
import { getCurriculum, SUPPORTED_CURRICULA, type SupportedCurriculumId } from '@/lib/learner/curriculum-registry'
import { CurriculumSubjectPicker } from './curriculum-subject-picker'
import { mergeLearnerSubjects, type LearnerSubject } from '@/lib/learner/store'

export function LearnerAcademicProfileSettings() {
  const { profile, saveProfile } = useCurriculum()
  const initialCurriculum = getCurriculum(profile.curriculum)
  const [curriculumId, setCurriculumId] = useState<SupportedCurriculumId>(initialCurriculum.id)
  const [levelId, setLevelId] = useState(initialCurriculum.levels.find((level) => level.label === profile.yearLevel)?.id || initialCurriculum.levels[0]?.id || '')
  const [selectedSubjects, setSelectedSubjects] = useState<LearnerSubject[]>(profile.subjects.filter((subject) => subject.active !== false && subject.curriculumId === initialCurriculum.id))
  const [preferredName, setPreferredName] = useState(profile.preferredName)
  const [schoolName, setSchoolName] = useState(profile.school?.name || '')
  const [country, setCountry] = useState(profile.school?.country || '')
  const [graduationYear, setGraduationYear] = useState(profile.expectedGraduationYear)
  const [status, setStatus] = useState('')
  const curriculum = getCurriculum(curriculumId)

  useEffect(() => {
    const nextCurriculum = getCurriculum(profile.curriculum)
    setCurriculumId(nextCurriculum.id)
    setLevelId(nextCurriculum.levels.find((level) => level.label === profile.yearLevel)?.id || nextCurriculum.levels[0]?.id || '')
    setSelectedSubjects(profile.subjects.filter((subject) => subject.active !== false && subject.curriculumId === nextCurriculum.id))
    setPreferredName(profile.preferredName)
    setSchoolName(profile.school?.name || '')
    setCountry(profile.school?.country || '')
    setGraduationYear(profile.expectedGraduationYear)
  }, [profile])

  const changeCurriculum = (nextId: SupportedCurriculumId) => {
    const next = getCurriculum(nextId)
    setCurriculumId(nextId)
    setLevelId(next.levels[0]?.id || '')
    setSelectedSubjects(profile.subjects.filter((subject) => subject.active !== false && subject.curriculumId === nextId))
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
        subjects: mergeLearnerSubjects(profile.subjects, selectedSubjects, curriculum.id),
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
        <legend className="mb-2 text-sm font-medium text-slate-700">{curriculum.terminology.subject}s</legend>
        <CurriculumSubjectPicker curriculumId={curriculum.id} value={selectedSubjects} onChange={setSelectedSubjects} defaultLevelId={levelId} />
      </fieldset>
      <div className="flex items-center gap-3"><Button type="button" onClick={() => void save()}>Save learner profile</Button>{status ? <p className="text-sm text-slate-600" role="status">{status}</p> : null}</div>
    </div>
  )
}
