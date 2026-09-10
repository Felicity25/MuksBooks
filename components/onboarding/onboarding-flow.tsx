'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { THEMES } from '@/lib/design/themes'
import { useCurriculum } from '@/components/learner/curriculum-context'
import { CurriculumSubjectPicker } from '@/components/learner/curriculum-subject-picker'
import { getCurriculum, isSupportedCurriculumId, SUPPORTED_CURRICULA, type SupportedCurriculumId } from '@/lib/learner/curriculum-registry'
import { mergeLearnerSubjects, type LearnerSubject } from '@/lib/learner/store'
import type { UserSettings, YearLevel } from '@/lib/user-settings'

const INTERESTS = [
  'STEM', 'Humanities', 'Economics', 'Biology', 'Psychology',
  'Engineering', 'Languages', 'Design', 'Mathematics', 'Research'
]

const YEAR_LEVELS: Array<{ value: YearLevel; label: string }> = [
  { value: 'first-year', label: 'First year' },
  { value: 'second-year', label: 'Second year' },
  { value: 'third-year', label: 'Third year' },
  { value: 'fourth-year', label: 'Fourth year' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'other', label: 'Other' }
]

const ACADEMIC_MODES = [
  { value: 'UNIVERSITY', label: 'University' },
  { value: 'LEARNER', label: 'School / Learner' }
] as const

function toggle(list: string[], value: string, enabled: boolean) {
  if (enabled) return list.includes(value) ? list : [...list, value]
  return list.filter((item) => item !== value)
}

export function OnboardingFlow() {
  const router = useRouter()
  const { settings, saveSettings, isLoading } = useAuth()
  const { profile, saveProfile } = useCurriculum()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(settings)
  const [settingsHydrated, setSettingsHydrated] = useState(false)
  const [learnerCurriculumId, setLearnerCurriculumId] = useState<SupportedCurriculumId>(isSupportedCurriculumId(profile.curriculum) ? profile.curriculum : 'VCE')
  const initialCurriculum = getCurriculum(learnerCurriculumId)
  const [learnerLevelId, setLearnerLevelId] = useState(initialCurriculum.levels.find((level) => level.label === profile.yearLevel)?.id || initialCurriculum.levels[0]?.id || '')
  const [learnerSubjects, setLearnerSubjects] = useState<LearnerSubject[]>(profile.subjects.filter((subject) => subject.active !== false && subject.curriculumId === initialCurriculum.id))

  const isLearner = draft.academicMode === 'LEARNER'
  const learnerCurriculum = getCurriculum(learnerCurriculumId)
  const learnerLevel = learnerCurriculum.levels.find((level) => level.id === learnerLevelId) || learnerCurriculum.levels[0]
  const progress = useMemo(() => `${step}/9`, [step])

  useEffect(() => {
    if (!isLoading && !settingsHydrated) {
      setDraft(settings)
      setSettingsHydrated(true)
    }
  }, [isLoading, settings, settingsHydrated])

  const next = () => setStep((value) => Math.min(9, value + 1))
  const previous = () => setStep((value) => Math.max(1, value - 1))

  const finish = async () => {
    setSubmitting(true)
    setError('')
    try {
      if (isLearner) await saveProfile({
        preferredName: draft.name || profile.preferredName || '',
        school: {
          name: draft.schoolName || profile.school?.name || '',
          country: draft.schoolCountry || profile.school?.country || '',
          stateRegion: profile.school?.stateRegion || ''
        },
        curriculum: learnerCurriculum.id,
        curriculumLabel: learnerCurriculum.shortName,
        yearLevel: learnerLevel?.label || '',
        expectedGraduationYear: draft.examSession || profile.expectedGraduationYear || '',
        subjects: mergeLearnerSubjects(profile.subjects, learnerSubjects, learnerCurriculum.id),
        onboardingCompleted: true,
        updatedAt: new Date().toISOString()
      })

      await saveSettings({
        academicMode: draft.academicMode,
        ...(isLearner ? {} : {
          institution: draft.institution,
          degree: draft.degree,
          fieldOfStudy: draft.fieldOfStudy,
          major: draft.major,
          yearLevel: draft.yearLevel
        }),
        careerInterests: draft.careerInterests,
        academicInterests: draft.academicInterests,
        theme: draft.theme,
        name: draft.name,
        timezone: draft.timezone
      } as Partial<UserSettings>)
      router.push('/')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Could not complete onboarding.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Welcome setup</p>
        <p className="text-xs text-slate-500">Step {progress}</p>
      </div>

      {step === 1 ? (
        <section className="space-y-3">
          <h1 className="text-page-title text-slate-950">Welcome to MuksBooks</h1>
          <p className="text-body text-slate-600">Your personalised academia app.</p>
          <p className="text-sm text-slate-600">Create your study environment in a few quick steps.</p>
          <Button type="button" onClick={next} disabled={isLoading || !settingsHydrated}>{isLoading ? 'Loading settings...' : 'Get started'}</Button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <h2 className="text-section-title text-slate-950">How are you using MuksBooks?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACADEMIC_MODES.map((option) => {
              const selected = draft.academicMode === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDraft({ ...draft, academicMode: option.value })}
                  className={`rounded-xl border p-4 text-left transition ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'}`}
                >
                  <div className="text-lg font-semibold">{option.label}</div>
                  <div className="mt-1 text-sm opacity-80">
                    {option.value === 'UNIVERSITY' ? 'University studies and degree lifecycle.' : 'School, subjects, IB, and university planning.'}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <h2 className="text-section-title text-slate-950">{isLearner ? 'Tell us about your school' : 'Choose your institution'}</h2>
          {!isLearner ? <label className="block text-sm font-medium text-slate-700">University or institution<input value={draft.institution} onChange={(event) => setDraft({ ...draft, institution: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Monash University" /></label> : <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">School name
              <input value={draft.schoolName} onChange={(event) => setDraft({ ...draft, schoolName: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="International School of Melbourne" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Country
              <input value={draft.schoolCountry} onChange={(event) => setDraft({ ...draft, schoolCountry: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Australia" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">Curriculum
              <select value={learnerCurriculumId} onChange={(event) => { const next = event.target.value as SupportedCurriculumId; const definition = getCurriculum(next); setLearnerCurriculumId(next); setLearnerLevelId(definition.levels[0]?.id || ''); setLearnerSubjects(profile.subjects.filter((subject) => subject.active !== false && subject.curriculumId === next)) }} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                {SUPPORTED_CURRICULA.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">{learnerCurriculum.terminology.level}
              <select value={learnerLevelId} onChange={(event) => setLearnerLevelId(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                {learnerCurriculum.levels.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">Exam session (optional)
            <input value={draft.examSession} onChange={(event) => setDraft({ ...draft, examSession: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="May 2027" />
          </label>
          </>}
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-3">
          <h2 className="text-section-title text-slate-950">{isLearner ? `Choose your ${learnerCurriculum.terminology.subject.toLowerCase()}s` : 'What are you studying?'}</h2>
          {isLearner ? <CurriculumSubjectPicker curriculumId={learnerCurriculum.id} value={learnerSubjects} onChange={setLearnerSubjects} defaultLevelId={learnerLevelId} /> : <label className="block text-sm font-medium text-slate-700">Degree<input value={draft.degree} onChange={(event) => setDraft({ ...draft, degree: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Bachelor of Actuarial Science" /></label>}
        </section>
      ) : null}

      {step === 5 ? (
        <section className="space-y-3">
          <h2 className="text-section-title text-slate-950">{isLearner ? 'What do you want MuksBooks to support?' : 'What are you studying?'}</h2>
          {isLearner ? <p className="text-sm leading-6 text-slate-600">Your {learnerCurriculum.shortName} profile will use {learnerCurriculum.terminology.syllabus.toLowerCase()}, {learnerCurriculum.terminology.topic.toLowerCase()} and {learnerCurriculum.terminology.assessment.toLowerCase()} terminology throughout School and Resources.</p> : <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">Degree
              <input value={draft.degree} onChange={(event) => setDraft({ ...draft, degree: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Bachelor of Actuarial Science" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Field / discipline
              <input value={draft.fieldOfStudy} onChange={(event) => setDraft({ ...draft, fieldOfStudy: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Actuarial Studies" />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">Major / specialisation
            <input value={draft.major} onChange={(event) => setDraft({ ...draft, major: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Quantitative Finance" />
          </label>
          </>}
        </section>
      ) : null}

      {step === 6 ? (
        <section className="space-y-3">
          <h2 className="text-section-title text-slate-950">{isLearner ? 'When do you expect to graduate?' : 'What year are you in?'}</h2>
          {isLearner ? <input value={draft.examSession} onChange={(event) => setDraft({ ...draft, examSession: event.target.value })} placeholder="2027" className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /> : <select value={draft.yearLevel} onChange={(event) => setDraft({ ...draft, yearLevel: event.target.value as YearLevel })} className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
            {YEAR_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
          </select>}
        </section>
      ) : null}

      {step === 7 ? (
        <section className="space-y-3">
          <h2 className="text-section-title text-slate-950">What are you interested in?</h2>
          <p className="text-sm text-slate-600">Used for future careers and recommendation personalisation.</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => {
              const selected = draft.careerInterests.includes(interest)
              return (
                <label key={interest} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => setDraft({
                      ...draft,
                      careerInterests: toggle(draft.careerInterests, interest, event.target.checked),
                      academicInterests: toggle(draft.academicInterests, interest, event.target.checked)
                    })}
                    className="sr-only"
                  />
                  {interest}
                </label>
              )
            })}
          </div>
        </section>
      ) : null}

      {step === 8 ? (
        <section className="space-y-3">
          <h2 className="text-section-title text-slate-950">Make MuksBooks yours</h2>
          <p className="text-sm text-slate-600">Choose how you want your study space to feel.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {THEMES.map((theme) => {
              const selected = draft.theme === theme.id
              return (
                <button key={theme.id} type="button" onClick={() => setDraft({ ...draft, theme: theme.id })} className={`rounded-lg border p-3 text-left ${selected ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-400'}`}>
                  <div className="h-16 rounded-md" style={{ backgroundColor: theme.preview.background, border: `1px solid ${theme.preview.sidebar}` }}>
                    <div className="flex h-full">
                      <div className="w-1/3" style={{ backgroundColor: theme.preview.sidebar }} />
                      <div className="flex-1 p-2"><div className="h-2 w-8 rounded-sm" style={{ backgroundColor: theme.preview.text, opacity: 0.5 }} /><div className="mt-1 h-2 w-5 rounded-sm" style={{ backgroundColor: theme.preview.accent }} /></div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between"><span className="text-sm font-semibold text-slate-900">{theme.name}</span>{selected ? <Check className="h-4 w-4 text-emerald-600" /> : null}</div>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {step === 9 ? (
        <section className="space-y-3">
          <h2 className="text-section-title text-slate-950">Your MuksBooks is ready</h2>
          <p className="text-sm text-slate-600">You can update any preference later in Personalisation.</p>
          {error ? <p className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
          <Button type="button" onClick={finish} disabled={submitting}>{submitting ? 'Saving...' : 'Enter dashboard'}</Button>
        </section>
      ) : null}

      {step > 1 && step < 9 ? (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <Button type="button" variant="outline" onClick={previous}>Back</Button>
          <Button type="button" onClick={next}>Continue <ChevronRight className="ml-2 h-4 w-4" /></Button>
        </div>
      ) : null}
    </Card>
  )
}
