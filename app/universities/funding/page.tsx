'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search, ShieldCheck, WalletCards } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { FundingNavigation } from '@/components/universities/funding-navigation'
import { FundingOpportunityCard } from '@/components/universities/funding-opportunity-card'
import { Card } from '@/components/ui/card'
import { getLearnerProfile, type LearnerProfile } from '@/lib/learner/store'
import { createFundingApplication, getFundingEligibility, searchFundingOpportunities } from '@/lib/universities/funding-domain'
import { FUNDING_OPPORTUNITIES, getFundingDiagnostics } from '@/lib/universities/funding-data'
import { universityStorage } from '@/lib/universities/storage'
import type { ApplicantType, FundingApplication, FundingOpportunity, FundingStudyLevel, FundingType } from '@/lib/universities/types'

type FundingTab = 'FOR_YOU' | 'EXPLORE' | 'UNIVERSITY' | 'GOVERNMENT' | 'BURSARIES' | 'EXTERNAL' | 'SAVED'
const tabs: Array<{ id: FundingTab; label: string }> = [{ id: 'FOR_YOU', label: 'For you' }, { id: 'EXPLORE', label: 'Explore' }, { id: 'UNIVERSITY', label: 'University scholarships' }, { id: 'GOVERNMENT', label: 'Government support' }, { id: 'BURSARIES', label: 'Bursaries' }, { id: 'EXTERNAL', label: 'External funding' }, { id: 'SAVED', label: 'Saved' }]
const countries = ['All countries', 'South Africa', 'Australia', 'United Kingdom', 'Canada', 'United States']
const fundingTypes: Array<'ALL' | FundingType> = ['ALL', 'UNIVERSITY_SCHOLARSHIP', 'MERIT_SCHOLARSHIP', 'NEED_BASED_AID', 'BURSARY', 'GOVERNMENT_GRANT', 'GOVERNMENT_STUDENT_FINANCE', 'TUITION_SUBSIDY', 'LOAN', 'EXTERNAL_SCHOLARSHIP']
const label = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function FundingPage() {
  const { isGuest, settings, saveSettings } = useAuth()
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [saved, setSaved] = useState<string[]>([])
  const [applications, setApplications] = useState<FundingApplication[]>([])
  const [tab, setTab] = useState<FundingTab>('FOR_YOU')
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('All countries')
  const [fundingType, setFundingType] = useState<'ALL' | FundingType>('ALL')
  const [openNow, setOpenNow] = useState(false)
  const [applicantType, setApplicantType] = useState<ApplicantType>('UNCERTAIN')
  const [studyLevel, setStudyLevel] = useState<FundingStudyLevel>('BACHELOR')

  useEffect(() => {
    const loaded = getLearnerProfile()
    setProfile(loaded)
    setSaved(isGuest ? universityStorage.getFundingSaved() : settings.fundingSaved)
    setApplications(isGuest ? universityStorage.getFundingApplications() : settings.fundingApplications)
    setCountry(loaded.universityPlanning.preferredCountries[0] || 'All countries')
  }, [isGuest, settings.fundingApplications, settings.fundingSaved])

  const persistSaved = (next: string[]) => { if (isGuest) universityStorage.saveFundingSaved(next); else void saveSettings({ fundingSaved: next }); setSaved(next) }
  const persistApplications = (next: FundingApplication[]) => { if (isGuest) universityStorage.saveFundingApplications(next); else void saveSettings({ fundingApplications: next }); setApplications(next) }
  const toggleSaved = (id: string) => persistSaved(saved.includes(id) ? saved.filter((item) => item !== id) : [...saved, id])
  const startApplication = (opportunity: FundingOpportunity) => {
    if (applications.some((application) => application.fundingOpportunityId === opportunity.id)) return
    persistApplications([...applications, createFundingApplication(opportunity)])
    if (!saved.includes(opportunity.id)) persistSaved([...saved, opportunity.id])
  }

  const visible = useMemo(() => {
    let items = searchFundingOpportunities(FUNDING_OPPORTUNITIES, query)
    if (tab === 'UNIVERSITY') items = items.filter((item) => ['UNIVERSITY', 'FACULTY'].includes(item.providerType))
    if (tab === 'GOVERNMENT') items = items.filter((item) => item.providerType === 'GOVERNMENT')
    if (tab === 'BURSARIES') items = items.filter((item) => ['BURSARY', 'CORPORATE_BURSARY', 'INDUSTRY_BURSARY'].includes(item.fundingType))
    if (tab === 'EXTERNAL') items = items.filter((item) => !['UNIVERSITY', 'FACULTY', 'GOVERNMENT'].includes(item.providerType))
    if (tab === 'SAVED') items = items.filter((item) => saved.includes(item.id))
    if (country !== 'All countries') items = items.filter((item) => item.providerCountry === country || item.eligibleDestinationCountries.includes(country))
    if (fundingType !== 'ALL') items = items.filter((item) => item.fundingType === fundingType)
    if (openNow) items = items.filter((item) => item.active && (!item.applicationOpensAt || new Date(item.applicationOpensAt) <= new Date()) && (!item.applicationDeadline || new Date(`${item.applicationDeadline}T23:59:59Z`) >= new Date()))
    if (tab === 'FOR_YOU') items = [...items].sort((left, right) => {
      const leftResult = getFundingEligibility(left, { learnerProfile: profile, destinationCountry: country === 'All countries' ? undefined : country, applicantType, studyLevel })
      const rightResult = getFundingEligibility(right, { learnerProfile: profile, destinationCountry: country === 'All countries' ? undefined : country, applicantType, studyLevel })
      const rank = (state: string) => ({ STRONG_POTENTIAL_MATCH: 5, POTENTIAL_MATCH: 4, POSSIBLE_MATCH: 3, MISSING_INFORMATION: 2, REQUIREMENTS_NOT_STRUCTURED: 1 }[state] ?? 0)
      return rank(rightResult.state) - rank(leftResult.state)
    })
    return items
  }, [applicantType, country, fundingType, openNow, profile, query, saved, studyLevel, tab])

  const diagnostics = getFundingDiagnostics()
  const hasProfile = Boolean(profile?.universityPlanning.citizenships.length || profile?.universityPlanning.residenceCountry || profile?.universityPlanning.predictedOverall)

  return <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/universities" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Universities</Link>
    <header><p className="text-sm font-semibold uppercase text-emerald-700">University planning</p><h1 className="mt-1 text-3xl font-semibold text-slate-950">Scholarships &amp; Funding</h1><p className="mt-2 max-w-3xl text-slate-600">Explore funding currently indexed by MuksBooks, understand repayment and eligibility, track applications, and build an honest funding plan.</p></header>
    <FundingNavigation />
    <div className="grid gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Active opportunities</p><p className="mt-1 text-2xl font-semibold text-slate-950">{diagnostics.active}</p></Card><Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Saved</p><p className="mt-1 text-2xl font-semibold text-slate-950">{saved.length}</p></Card><Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Applications</p><p className="mt-1 text-2xl font-semibold text-slate-950">{applications.length}</p></Card></div>
    {!hasProfile ? <Card className="flex gap-3 border-sky-200 bg-sky-50 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><div><p className="font-semibold text-sky-950">Discovery works without a profile</p><p className="mt-1 text-sm text-sky-800">Published criteria remain visible. Add citizenship, residence and grades to your learner profile for personalised eligibility matching.</p></div></Card> : null}
    <div className="flex max-w-full gap-2 overflow-x-auto" role="tablist" aria-label="Funding categories">{tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`h-10 shrink-0 rounded-md border px-3 text-sm font-medium ${tab === item.id ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{item.label}</button>)}</div>
    <section className="grid gap-3 border-y border-slate-200 py-4 md:grid-cols-5" aria-label="Funding filters">
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Search<div className="mt-1 flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3"><Search className="h-4 w-4 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Engineering bursary, NSFAS, Monash..." className="min-w-0 flex-1 bg-transparent outline-none" /></div></label>
      <label className="text-sm font-medium text-slate-700">Country<select value={country} onChange={(event) => setCountry(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">{countries.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Funding type<select value={fundingType} onChange={(event) => setFundingType(event.target.value as typeof fundingType)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">{fundingTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={openNow} onChange={(event) => setOpenNow(event.target.checked)} />Open now</label>
      <label className="text-sm font-medium text-slate-700">Applicant status<select value={applicantType} onChange={(event) => setApplicantType(event.target.value as ApplicantType)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option value="UNCERTAIN">Not sure</option><option value="DOMESTIC">Domestic</option><option value="INTERNATIONAL">International</option></select></label>
      <label className="text-sm font-medium text-slate-700">Study level<select value={studyLevel} onChange={(event) => setStudyLevel(event.target.value as FundingStudyLevel)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option value="SCHOOL_LEAVER">School leaver</option><option value="BACHELOR">Bachelor</option><option value="DIPLOMA">Diploma</option><option value="TRANSFER">Transfer</option><option value="CURRENT_UNIVERSITY">Current university student</option><option value="HONOURS">Honours</option></select></label>
    </section>
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-950">{tabs.find((item) => item.id === tab)?.label}</h2><p className="mt-1 text-sm text-slate-600">{visible.length} opportunity record{visible.length === 1 ? '' : 's'} currently indexed. This is not an exhaustive list.</p></div><WalletCards className="h-5 w-5 text-emerald-700" /></div>
    <div className="grid gap-4 lg:grid-cols-2">{visible.map((opportunity) => <FundingOpportunityCard key={opportunity.id} opportunity={opportunity} eligibility={getFundingEligibility(opportunity, { learnerProfile: profile, destinationCountry: country === 'All countries' ? undefined : country, applicantType, studyLevel })} saved={saved.includes(opportunity.id)} tracked={applications.some((application) => application.fundingOpportunityId === opportunity.id)} onToggleSave={() => toggleSaved(opportunity.id)} onStart={() => startApplication(opportunity)} />)}{!visible.length ? <Card className="p-6 text-sm text-slate-600 lg:col-span-2">No indexed opportunities match these filters. Broaden the search or add a learner-entered opportunity from Funding Applications.</Card> : null}</div>
  </main>
}