'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getLearnerProfile, saveLearnerProfile, type LearnerEnglishTest, type LearnerProfile } from '@/lib/learner/store'
import { INTEREST_AREAS } from '@/lib/universities/discovery'

const COUNTRIES = ['South Africa', 'Australia', 'United Kingdom', 'United States', 'Canada', 'Singapore', 'Malaysia']
const PRIORITIES = ['Course fit', 'Entry likelihood', 'Career opportunities', 'Location', 'Cost', 'Scholarships', 'University reputation', 'Campus experience', 'Flexibility']
const STUDY_AREAS = INTEREST_AREAS.flatMap((area) => area.studyAreas).filter((value, index, values) => values.indexOf(value) === index)

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export function UniversityPlanningSettings() {
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => setProfile(getLearnerProfile()), [])
  if (!profile) return null

  const planning = profile.universityPlanning
  const english = planning.englishTests[0]
  const updateEnglish = (updates: Partial<LearnerEnglishTest>) => {
    const next: LearnerEnglishTest = { ...(english ?? { test: 'IELTS' as const }), ...updates }
    setProfile({ ...profile, universityPlanning: { ...planning, englishTests: [next] } })
  }
  const updateList = (field: 'preferredCountries' | 'studyAreas' | 'priorities', value: string) => setProfile({ ...profile, universityPlanning: { ...planning, [field]: toggle(planning[field], value) } })
  const save = () => {
    setProfile(saveLearnerProfile({ ...profile, updatedAt: new Date().toISOString() }))
    setMessage('University planning saved.')
  }

  return (
    <Card className="space-y-5">
      <div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">University planning</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Applicant context and preferences</h2><p className="mt-1 text-sm text-slate-600">Optional details improve recommendations. Citizenship, residence and school country remain distinct and do not determine fee status.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Citizenships<input value={planning.citizenships.join(', ')} onChange={(event) => setProfile({ ...profile, universityPlanning: { ...planning, citizenships: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) } })} placeholder="South Africa, Australia" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /><span className="mt-1 block text-xs font-normal text-slate-500">Separate multiple citizenships with commas.</span></label>
        <label className="text-sm font-medium text-slate-700">Country of residence<input value={planning.residenceCountry} onChange={(event) => setProfile({ ...profile, universityPlanning: { ...planning, residenceCountry: event.target.value } })} placeholder="Australia" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
        <label className="text-sm font-medium text-slate-700">Predicted overall score<input type="number" value={planning.predictedOverall ?? ''} onChange={(event) => setProfile({ ...profile, universityPlanning: { ...planning, predictedOverall: event.target.value ? Number(event.target.value) : undefined } })} placeholder={profile.curriculum === 'IB' ? '40' : 'Optional'} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /><span className="mt-1 block text-xs font-normal text-slate-500">Predicted scores inform matching. Target grades remain aspirational.</span></label>
      </div>
      <fieldset><legend className="text-sm font-medium text-slate-700">Preferred study countries</legend><div className="mt-2 flex flex-wrap gap-2">{COUNTRIES.map((country) => <button key={country} type="button" onClick={() => updateList('preferredCountries', country)} aria-pressed={planning.preferredCountries.includes(country)} className={`rounded-full border px-3 py-1.5 text-sm ${planning.preferredCountries.includes(country) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{country}</button>)}</div></fieldset>
      <fieldset><legend className="text-sm font-medium text-slate-700">Study areas</legend><div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">{STUDY_AREAS.map((area) => <button key={area} type="button" onClick={() => updateList('studyAreas', area)} aria-pressed={planning.studyAreas.includes(area)} className={`rounded-full border px-3 py-1.5 text-sm ${planning.studyAreas.includes(area) ? 'border-sky-700 bg-sky-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{area}</button>)}</div></fieldset>
      <fieldset><legend className="text-sm font-medium text-slate-700">What matters most?</legend><div className="mt-2 flex flex-wrap gap-2">{PRIORITIES.map((priority) => <button key={priority} type="button" onClick={() => updateList('priorities', priority)} aria-pressed={planning.priorities.includes(priority)} className={`rounded-full border px-3 py-1.5 text-sm ${planning.priorities.includes(priority) ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{priority}</button>)}</div></fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">English test<select value={english?.test ?? 'IELTS'} onChange={(event) => updateEnglish({ test: event.target.value as LearnerEnglishTest['test'] })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"><option>IELTS</option><option>TOEFL</option><option>PTE</option><option value="CAMBRIDGE">Cambridge English</option></select></label>
        <label className="text-sm font-medium text-slate-700">Overall score<input type="number" step="0.5" value={english?.overall ?? ''} onChange={(event) => updateEnglish({ overall: event.target.value ? Number(event.target.value) : undefined })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
        <label className="text-sm font-medium text-slate-700">Test date<input type="date" value={english?.testDate ?? ''} onChange={(event) => updateEnglish({ testDate: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
      </div>
      <div className="flex items-center gap-3"><Button type="button" onClick={save}>Save university planning</Button>{message ? <p role="status" className="text-sm font-medium text-emerald-700">{message}</p> : null}</div>
    </Card>
  )
}
