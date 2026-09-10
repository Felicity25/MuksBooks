'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCurriculum } from '@/components/learner/curriculum-context'
import { type LearnerAdmissionsTest, type LearnerEnglishTest, type LearnerProfile } from '@/lib/learner/store'
import { INTEREST_AREAS } from '@/lib/universities/discovery'

const COUNTRIES = ['South Africa', 'Australia', 'United Kingdom', 'United States', 'Canada', 'Singapore', 'Malaysia']
const PRIORITIES = ['Course fit', 'Entry likelihood', 'Career opportunities', 'Location', 'Cost', 'Scholarships', 'University reputation', 'Campus experience', 'Flexibility']
const STUDY_AREAS = INTEREST_AREAS.flatMap((area) => area.studyAreas).filter((value, index, values) => values.indexOf(value) === index)

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export function UniversityPlanningSettings() {
  const { profile: savedProfile, saveProfile } = useCurriculum()
  const [profile, setProfile] = useState<LearnerProfile>(savedProfile)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => setProfile(savedProfile), [savedProfile])

  const planning = profile.universityPlanning
  const english = planning.englishTests[0]
  const updateEnglish = (updates: Partial<LearnerEnglishTest>) => {
    const now = new Date().toISOString()
    const next: LearnerEnglishTest = { ...(english ?? { id: `english-${Date.now()}`, test: 'IELTS' as const, createdAt: now }), ...updates, source: 'MANUAL', updatedAt: now }
    setProfile({ ...profile, universityPlanning: { ...planning, englishTests: [next] } })
  }
  const updateEnglishComponent = (component: string, value: string) => {
    const components = { ...(english?.components || {}) }
    if (value) components[component] = Number(value)
    else delete components[component]
    updateEnglish({ components })
  }
  const updateAdmissionsTest = (index: number, updates: Partial<LearnerAdmissionsTest>) => setProfile({
    ...profile,
    universityPlanning: { ...planning, admissionsTests: planning.admissionsTests.map((test, testIndex) => testIndex === index ? { ...test, ...updates, source: 'MANUAL', updatedAt: new Date().toISOString() } : test) }
  })
  const addAdmissionsTest = () => {
    const now = new Date().toISOString()
    setProfile({ ...profile, universityPlanning: { ...planning, admissionsTests: [...planning.admissionsTests, { id: `test-${Date.now()}`, test: 'SAT', resultStatus: 'BOOKED', source: 'MANUAL', createdAt: now, updatedAt: now }] } })
  }
  const removeAdmissionsTest = (index: number) => setProfile({ ...profile, universityPlanning: { ...planning, admissionsTests: planning.admissionsTests.filter((_, testIndex) => testIndex !== index) } })
  const updateList = (field: 'preferredCountries' | 'studyAreas' | 'priorities', value: string) => setProfile({ ...profile, universityPlanning: { ...planning, [field]: toggle(planning[field], value) } })
  const save = async () => {
    setSaving(true)
    setMessage('Saving...')
    try {
      const saved = await saveProfile(profile)
      setProfile(saved)
      setMessage('University planning saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'University planning could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="space-y-5">
      <div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">University planning</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Applicant context and preferences</h2><p className="mt-1 text-sm text-slate-600">Optional details improve recommendations. Citizenship, residence and school country remain distinct and do not determine fee status.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Citizenships<input value={planning.citizenships.join(', ')} onChange={(event) => setProfile({ ...profile, universityPlanning: { ...planning, citizenships: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) } })} placeholder="South Africa, Australia" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /><span className="mt-1 block text-xs font-normal text-slate-500">Separate multiple citizenships with commas.</span></label>
        <label className="text-sm font-medium text-slate-700">Country of residence<input value={planning.residenceCountry} onChange={(event) => setProfile({ ...profile, universityPlanning: { ...planning, residenceCountry: event.target.value } })} placeholder="Australia" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
        <label className="text-sm font-medium text-slate-700">Predicted overall score<input type="number" value={planning.predictedOverall ?? ''} onChange={(event) => setProfile({ ...profile, universityPlanning: { ...planning, predictedOverall: event.target.value ? Number(event.target.value) : undefined } })} placeholder={profile.curriculum === 'IB' ? '40' : 'Optional'} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /><span className="mt-1 block text-xs font-normal text-slate-500">Predicted scores inform matching. Target grades remain aspirational.</span></label>
        <label className="text-sm font-medium text-slate-700">Primary language<input value={profile.primaryLanguage ?? ''} onChange={(event) => setProfile({ ...profile, primaryLanguage: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Optional" /></label>
        <label className="text-sm font-medium text-slate-700">Language of instruction<input value={profile.languageOfInstruction ?? ''} onChange={(event) => setProfile({ ...profile, languageOfInstruction: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="e.g. English" /></label>
        <label className="text-sm font-medium text-slate-700">Years studied in English<input type="number" min="0" max="20" value={profile.yearsStudiedInEnglish ?? ''} onChange={(event) => setProfile({ ...profile, yearsStudiedInEnglish: event.target.value ? Number(event.target.value) : undefined })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
        <label className="text-sm font-medium text-slate-700">Previous qualifications<input value={(profile.previousQualifications ?? []).join(', ')} onChange={(event) => setProfile({ ...profile, previousQualifications: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Separate with commas" /></label>
      </div>
      <fieldset><legend className="text-sm font-medium text-slate-700">Preferred study countries</legend><div className="mt-2 flex flex-wrap gap-2">{COUNTRIES.map((country) => <button key={country} type="button" onClick={() => updateList('preferredCountries', country)} aria-pressed={planning.preferredCountries.includes(country)} className={`rounded-full border px-3 py-1.5 text-sm ${planning.preferredCountries.includes(country) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{country}</button>)}</div></fieldset>
      <fieldset><legend className="text-sm font-medium text-slate-700">Study areas</legend><div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">{STUDY_AREAS.map((area) => <button key={area} type="button" onClick={() => updateList('studyAreas', area)} aria-pressed={planning.studyAreas.includes(area)} className={`rounded-full border px-3 py-1.5 text-sm ${planning.studyAreas.includes(area) ? 'border-sky-700 bg-sky-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{area}</button>)}</div></fieldset>
      <fieldset><legend className="text-sm font-medium text-slate-700">What matters most?</legend><div className="mt-2 flex flex-wrap gap-2">{PRIORITIES.map((priority) => <button key={priority} type="button" onClick={() => updateList('priorities', priority)} aria-pressed={planning.priorities.includes(priority)} className={`rounded-full border px-3 py-1.5 text-sm ${planning.priorities.includes(priority) ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{priority}</button>)}</div></fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">English test<select value={english?.test ?? 'IELTS'} onChange={(event) => updateEnglish({ test: event.target.value as LearnerEnglishTest['test'] })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"><option>IELTS</option><option>TOEFL</option><option>PTE</option><option value="CAMBRIDGE">Cambridge English</option></select></label>
        <label className="text-sm font-medium text-slate-700">Overall score<input type="number" step="0.5" value={english?.overall ?? ''} onChange={(event) => updateEnglish({ overall: event.target.value ? Number(event.target.value) : undefined })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
        <label className="text-sm font-medium text-slate-700">Test date<input type="date" value={english?.testDate ?? ''} onChange={(event) => updateEnglish({ testDate: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
      </div>
      {english?.test === 'TOEFL' ? <label className="block max-w-xs text-sm font-medium text-slate-700">TOEFL score scale<select value={english.scoreScale ?? ''} onChange={(event) => updateEnglish({ scoreScale: event.target.value || undefined })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"><option value="">Select score scale</option><option value="1-120">1-120 (tests before 21 Jan 2026)</option><option value="1-6">1-6 (tests from 21 Jan 2026)</option></select></label> : null}
      {english?.test === 'CAMBRIDGE' ? <label className="block max-w-xs text-sm font-medium text-slate-700">Cambridge qualification<input value={english.qualification ?? ''} onChange={(event) => updateEnglish({ qualification: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="e.g. C1 Advanced" /></label> : null}
      <fieldset><legend className="text-sm font-medium text-slate-700">English component scores</legend><div className="mt-2 grid gap-3 sm:grid-cols-4">{['listening', 'reading', 'speaking', 'writing'].map((component) => <label key={component} className="text-xs font-medium capitalize text-slate-600">{component}<input type="number" step="0.5" value={english?.components?.[component] ?? ''} onChange={(event) => updateEnglishComponent(component, event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" /></label>)}</div></fieldset>
      <fieldset><div className="flex flex-wrap items-center justify-between gap-3"><div><legend className="text-sm font-medium text-slate-700">Admissions tests</legend><p className="mt-1 text-xs text-slate-500">Record booked sittings and received results. A booking is not treated as a qualifying score.</p></div><Button type="button" size="sm" variant="secondary" onClick={addAdmissionsTest}><Plus className="mr-2 h-4 w-4" />Add test</Button></div><div className="mt-3 space-y-3">{planning.admissionsTests.map((test, index) => <div key={test.id || `${test.test}-${index}`} className="grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"><label className="text-xs font-medium text-slate-600">Test<select value={test.test} onChange={(event) => updateAdmissionsTest(index, { test: event.target.value as LearnerAdmissionsTest['test'] })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option value="SAT">SAT</option><option value="ACT">ACT</option><option value="NBT_AQL">NBT AQL</option><option value="NBT_MAT">NBT MAT</option><option value="UCAT">UCAT</option><option value="UCAT_ANZ">UCAT ANZ</option><option value="GAMSAT">GAMSAT</option><option value="LNAT">LNAT</option><option value="TMUA">TMUA</option><option value="ESAT">ESAT</option><option value="ISAT">ISAT</option></select></label><label className="text-xs font-medium text-slate-600">Status<select value={test.resultStatus ?? 'BOOKED'} onChange={(event) => updateAdmissionsTest(index, { resultStatus: event.target.value as LearnerAdmissionsTest['resultStatus'] })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option value="BOOKED">Booked</option><option value="AWAITING_RESULT">Awaiting result</option><option value="RESULT_RECEIVED">Result received</option></select></label><label className="text-xs font-medium text-slate-600">Score<input type="number" step="0.5" value={test.score ?? ''} onChange={(event) => updateAdmissionsTest(index, { score: event.target.value ? Number(event.target.value) : undefined })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" /></label><label className="text-xs font-medium text-slate-600">Test date<input type="date" value={test.testDate ?? ''} onChange={(event) => updateAdmissionsTest(index, { testDate: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" /></label><Button type="button" size="sm" variant="ghost" className="h-10 w-10 self-end px-0" onClick={() => removeAdmissionsTest(index)} title="Remove test"><Trash2 className="h-4 w-4" /><span className="sr-only">Remove test</span></Button></div>)}</div></fieldset>
      <div className="flex items-center gap-3"><Button type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Saving...' : 'Save university planning'}</Button>{message ? <p role="status" className="text-sm font-medium text-slate-700">{message}</p> : null}</div>
    </Card>
  )
}
