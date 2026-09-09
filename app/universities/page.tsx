'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Filter, Globe2, Search, Sparkles } from 'lucide-react'
import { ProgrammeActions } from '@/components/universities/programme-actions'
import { SectionShell } from '@/components/section-shell'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DEFAULT_LEARNER_PROFILE, getLearnerProfile, saveLearnerProfile, type LearnerProfile } from '@/lib/learner/store'
import { COUNTRY_OPTIONS, QUALIFICATION_OPTIONS, REGION_OPTIONS, STUDY_AREA_OPTIONS, getCountryFilters, searchUniversityCatalogue } from '@/lib/universities/catalog'
import { getRelevantStudyAreas, INTEREST_AREAS } from '@/lib/universities/discovery'
import { matchProgramme } from '@/lib/universities/matching'
import { universityStorage } from '@/lib/universities/storage'

const PREFERENCE_COUNTRIES = ['South Africa', 'Australia', 'United Kingdom', 'United States', 'Canada', 'Singapore', 'Malaysia']
const PRIORITIES = ['Course fit', 'Entry likelihood', 'Career opportunities', 'Location', 'Cost', 'Scholarships', 'University reputation', 'Campus experience', 'Flexibility']

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export default function UniversitiesPage() {
  const { isGuest, settings } = useAuth()
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('All')
  const [region, setRegion] = useState('All')
  const [studyArea, setStudyArea] = useState('All')
  const [qualification, setQualification] = useState('All')
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [shortlistCount, setShortlistCount] = useState(0)
  const [applicationCount, setApplicationCount] = useState(0)

  useEffect(() => {
    const loaded = getLearnerProfile()
    setProfile(loaded)
    setShortlistCount(isGuest ? universityStorage.getShortlist().length : settings.universityShortlist.length)
    setApplicationCount(isGuest ? universityStorage.getApplications().length : settings.universityApplications.length)
    setShowSetup(!loaded.universityPlanning.studyAreas.length && !loaded.universityPlanning.preferredCountries.length)
  }, [isGuest, settings.universityApplications.length, settings.universityShortlist.length])

  const filteredResults = useMemo(() => {
    const results = searchUniversityCatalogue(query, { country, region, studyArea, qualification })
    if (!profile) return results
    return results.sort((left, right) => {
      const leftBoost = (profile.universityPlanning.preferredCountries.includes(left.country) ? 12 : 0) + (left.programme.studyAreas.some((area) => profile.universityPlanning.studyAreas.includes(area)) ? 16 : 0)
      const rightBoost = (profile.universityPlanning.preferredCountries.includes(right.country) ? 12 : 0) + (right.programme.studyAreas.some((area) => profile.universityPlanning.studyAreas.includes(area)) ? 16 : 0)
      return (right.score + rightBoost) - (left.score + leftBoost)
    })
  }, [country, profile, qualification, query, region, studyArea])

  const relevantInterests = useMemo(() => getRelevantStudyAreas(profile?.subjects.map((subject) => subject.name) ?? [], profile?.universityPlanning.studyAreas ?? []), [profile])
  const countryCounts = getCountryFilters()
  const hasAcademicProfile = Boolean(profile && (profile.onboardingCompleted || profile.subjects.length || profile.universityPlanning.predictedOverall !== undefined))

  const updatePlanning = (field: 'studyAreas' | 'preferredCountries' | 'priorities', value: string) => {
    const current = profile ?? DEFAULT_LEARNER_PROFILE
    setProfile({ ...current, universityPlanning: { ...current.universityPlanning, [field]: toggle(current.universityPlanning[field], value) } })
  }

  const savePlanning = () => {
    if (!profile) return
    setProfile(saveLearnerProfile({ ...profile, updatedAt: new Date().toISOString() }))
    setShowSetup(false)
  }

  return (
    <SectionShell title="Universities" description="Find courses, universities and opportunities that fit you." contentClassName="space-y-6">
      <Card className="p-5">
        <label htmlFor="university-search" className="text-sm font-semibold text-slate-900">Search universities, courses, subjects or careers</label>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-sky-600">
          <Search className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <input id="university-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Computer Science, UCT, medicine or finance" className="w-full bg-transparent text-slate-950 placeholder:text-slate-400 focus:outline-none" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-slate-700">Country<select value={country} onChange={(event) => setCountry(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">{COUNTRY_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Region<select value={region} onChange={(event) => setRegion(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">{REGION_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Study area<select value={studyArea} onChange={(event) => setStudyArea(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">{STUDY_AREA_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Qualification<select value={qualification} onChange={(event) => setQualification(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">{QUALIFICATION_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
        </div>
      </Card>

      {showSetup && profile ? <Card className="space-y-5 border-sky-200 bg-sky-50/40 p-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">Optional setup</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Personalise your results</h2><p className="mt-1 text-sm text-slate-600">Search works without this. Choose any preferences that would make exploration more useful.</p></div>
        <fieldset><legend className="text-sm font-semibold text-slate-800">What are you interested in?</legend><div className="mt-2 flex flex-wrap gap-2">{INTEREST_AREAS.flatMap((area) => area.studyAreas).filter((value, index, values) => values.indexOf(value) === index).slice(0, 24).map((area) => <button key={area} type="button" onClick={() => updatePlanning('studyAreas', area)} aria-pressed={profile.universityPlanning.studyAreas.includes(area)} className={`rounded-full border px-3 py-1.5 text-sm ${profile.universityPlanning.studyAreas.includes(area) ? 'border-sky-700 bg-sky-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{area}</button>)}</div></fieldset>
        <fieldset><legend className="text-sm font-semibold text-slate-800">Where might you like to study?</legend><div className="mt-2 flex flex-wrap gap-2">{PREFERENCE_COUNTRIES.map((item) => <button key={item} type="button" onClick={() => updatePlanning('preferredCountries', item)} aria-pressed={profile.universityPlanning.preferredCountries.includes(item)} className={`rounded-full border px-3 py-1.5 text-sm ${profile.universityPlanning.preferredCountries.includes(item) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{item}</button>)}</div></fieldset>
        <fieldset><legend className="text-sm font-semibold text-slate-800">What matters most?</legend><div className="mt-2 flex flex-wrap gap-2">{PRIORITIES.map((item) => <button key={item} type="button" onClick={() => updatePlanning('priorities', item)} aria-pressed={profile.universityPlanning.priorities.includes(item)} className={`rounded-full border px-3 py-1.5 text-sm ${profile.universityPlanning.priorities.includes(item) ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{item}</button>)}</div></fieldset>
        <div className="flex gap-2"><Button type="button" onClick={savePlanning}>Save preferences</Button><Button type="button" variant="ghost" onClick={() => setShowSetup(false)}>Skip</Button></div>
      </Card> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{profile?.universityPlanning.studyAreas.length ? 'For you' : 'Explore by interest'}</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Study areas and pathways</h2></div><Sparkles className="h-5 w-5 text-sky-700" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{relevantInterests.slice(0, 6).map((interest) => <button key={interest.id} type="button" onClick={() => setStudyArea(interest.studyAreas[0])} className="rounded-lg border border-slate-200 p-3 text-left hover:border-sky-300 hover:bg-sky-50"><span className="font-semibold text-slate-900">{interest.name}</span><span className="mt-1 block text-sm text-slate-600">{interest.description}</span></button>)}</div></Card>
        <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Your workspace</h2><div className="mt-4 space-y-3"><Link href="/universities/compare" className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-800">Compare programmes <ArrowRight className="h-4 w-4" /></Link><Link href="/universities/applications" className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-800">Applications ({applicationCount}) <ArrowRight className="h-4 w-4" /></Link><Link href="/universities/calendar" className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-800">Deadlines and results <ArrowRight className="h-4 w-4" /></Link><p className="text-sm text-slate-600">{shortlistCount} shortlisted programme{shortlistCount === 1 ? '' : 's'} {isGuest ? 'on this device' : 'in your account'}.</p></div></Card>
      </div>

      <section aria-labelledby="countries-heading"><div className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-sky-700" /><h2 id="countries-heading" className="text-xl font-semibold text-slate-950">Explore by country</h2></div><p className="mt-1 text-sm text-slate-600">Explore institutions currently indexed in MuksBooks. Coverage status is shown honestly.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{countryCounts.map((item) => <Link key={item.code} href={`/universities/country/${item.code}`} className="rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-sky-300"><span className="font-semibold text-slate-950">{item.name}</span><span className="mt-1 block text-sm text-slate-600">{item.institutionCount} institutions • {item.programmeCount} programmes</span><span className="mt-2 block text-xs uppercase text-slate-500">{item.status}</span></Link>)}</div></section>

      <section aria-labelledby="results-heading"><div className="flex items-center justify-between gap-3"><div><h2 id="results-heading" className="text-xl font-semibold text-slate-950">Programmes</h2><p className="mt-1 text-sm text-slate-600">{filteredResults.length} matching programme{filteredResults.length === 1 ? '' : 's'}</p></div><Filter className="h-5 w-5 text-slate-500" /></div><div className="mt-4 grid gap-4 xl:grid-cols-2">{filteredResults.slice(0, 30).map((result) => {
        const match = hasAcademicProfile && profile ? matchProgramme(result.programme, profile, profile.universityPlanning) : null
        return <Card key={result.programme.id} className="space-y-4 p-5"><div><Link href={`/universities/${result.institution.id}/${result.programme.id}`} className="text-lg font-semibold text-slate-950 hover:text-sky-700">{result.programme.name}</Link><Link href={`/universities/${result.institution.id}`} className="mt-1 block text-sm text-slate-600 hover:text-sky-700">{result.institution.name} • {result.institution.city}, {result.country}</Link></div><div className="flex flex-wrap gap-2">{result.programme.studyAreas.map((area) => <span key={area} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{area}</span>)}</div><div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><p><strong className="text-slate-800">Qualification:</strong> {result.programme.degreeType}</p><p><strong className="text-slate-800">Duration:</strong> {result.programme.duration ?? 'Check official course'}</p></div>{match ? <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"><p className="font-semibold text-slate-900">Your match: {match.title}</p><p className="mt-1 text-slate-600">{match.reasons[0] ?? match.checks[0]}</p></div> : <p className="text-sm text-slate-600">Add your curriculum and grades to compare your profile with published requirements.</p>}<ProgrammeActions programmeId={result.programme.id} institutionId={result.institution.id} /></Card>
      })}{!filteredResults.length ? <Card className="p-6 text-sm text-slate-600 xl:col-span-2">No programmes match those filters. Try a broader course, university, or country search.</Card> : null}</div></section>
    </SectionShell>
  )
}