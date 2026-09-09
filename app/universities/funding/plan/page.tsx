'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { FundingNavigation } from '@/components/universities/funding-navigation'
import { Card } from '@/components/ui/card'
import { fundingPlanGap, fundingPlanTotals } from '@/lib/universities/funding-domain'
import { FUNDING_OPPORTUNITIES, PROGRAMME_COSTS } from '@/lib/universities/funding-data'
import { getInstitution, getProgramme } from '@/lib/universities/catalog'
import { universityStorage } from '@/lib/universities/storage'
import type { ApplicantType, FundingApplication, UniversityApplication } from '@/lib/universities/types'

const money = (amount: number, currency: string) => new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)

export default function FundingPlanPage() {
  const { isGuest, settings, saveSettings } = useAuth()
  const [fundingApplications, setFundingApplications] = useState<FundingApplication[]>([])
  const [universityApplications, setUniversityApplications] = useState<UniversityApplication[]>([])
  const [selectedApplicationId, setSelectedApplicationId] = useState('')
  const [applicantType, setApplicantType] = useState<ApplicantType>('INTERNATIONAL')
  const [currency, setCurrency] = useState('AUD')
  const [contribution, setContribution] = useState(0)
  const contributionKey = `${selectedApplicationId || 'unallocated'}:${currency}`
  useEffect(() => { const funding = isGuest ? universityStorage.getFundingApplications() : settings.fundingApplications; const universities = isGuest ? universityStorage.getApplications() : settings.universityApplications; const contributions = isGuest ? universityStorage.getFundingContributions() : settings.fundingPlanContributions; setFundingApplications(funding); setUniversityApplications(universities); setSelectedApplicationId((current) => current || universities[0]?.id || ''); setContribution(contributions[contributionKey] ?? contributions[currency] ?? 0) }, [contributionKey, currency, isGuest, settings.fundingApplications, settings.fundingPlanContributions, settings.universityApplications])
  const selected = universityApplications.find((application) => application.id === selectedApplicationId)
  const programme = selected ? getProgramme(selected.programmeId) : undefined
  const institution = selected ? getInstitution(selected.institutionId) : undefined
  const cost = useMemo(() => PROGRAMME_COSTS.filter((item) => item.institutionId === selected?.institutionId && (!item.programmeId || item.programmeId === selected.programmeId) && item.applicantType === applicantType).sort((left, right) => right.academicYear - left.academicYear)[0], [applicantType, selected])
  const totals = fundingPlanTotals(fundingApplications, FUNDING_OPPORTUNITIES, currency)
  const tuition = cost?.amount ?? cost?.rangeMax
  const gap = fundingPlanGap({ tuition, tuitionCurrency: cost?.currency, planCurrency: currency, confirmed: totals.confirmed, contribution })
  const persistContribution = (amount: number) => { setContribution(amount); const current = isGuest ? universityStorage.getFundingContributions() : settings.fundingPlanContributions; const next = { ...current, [contributionKey]: amount }; if (isGuest) universityStorage.saveFundingContributions(next); else void saveSettings({ fundingPlanContributions: next }) }

  return <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><Link href="/universities/funding" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Scholarships &amp; Funding</Link><FundingNavigation /><header><h1 className="text-3xl font-semibold text-slate-950">My Funding Plan</h1><p className="mt-2 text-slate-600">Compare an indexed tuition record with confirmed support, potential funding and your optional contribution.</p></header>
    <section className="grid gap-3 border-y border-slate-200 py-4 sm:grid-cols-3"><label className="text-sm font-medium text-slate-700">University application<select value={selectedApplicationId} onChange={(event) => setSelectedApplicationId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option value="">Choose an application</option>{universityApplications.map((application) => <option key={application.id} value={application.id}>{getProgramme(application.programmeId)?.name || application.customProgrammeName} · {getInstitution(application.institutionId)?.name || application.customInstitutionName}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Applicant type<select value={applicantType} onChange={(event) => setApplicantType(event.target.value as ApplicantType)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option value="DOMESTIC">Domestic</option><option value="INTERNATIONAL">International</option></select></label><label className="text-sm font-medium text-slate-700">Plan currency<select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option>AUD</option><option>ZAR</option><option>GBP</option><option>CAD</option><option>USD</option></select></label></section>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card className="p-5"><p className="text-xs font-semibold uppercase text-slate-500">Estimated tuition</p><p className="mt-2 text-2xl font-semibold text-slate-950">{tuition !== undefined && cost?.currency === currency ? money(tuition, currency) : 'Not indexed'}</p>{cost ? <a href={cost.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-700">Official fee source <ExternalLink className="h-3.5 w-3.5" /></a> : null}</Card><Card className="border-emerald-200 p-5"><p className="text-xs font-semibold uppercase text-emerald-700">Confirmed funding</p><p className="mt-2 text-2xl font-semibold text-slate-950">{money(totals.confirmed, currency)}</p><p className="mt-2 text-xs text-slate-500">Awarded or accepted only</p></Card><Card className="border-sky-200 p-5"><p className="text-xs font-semibold uppercase text-sky-700">Potential funding</p><p className="mt-2 text-2xl font-semibold text-slate-950">{money(totals.potential, currency)}</p><p className="mt-2 text-xs text-slate-500">Not guaranteed or secured</p></Card><Card className="p-5"><p className="text-xs font-semibold uppercase text-slate-500">Remaining estimated gap</p><p className="mt-2 text-2xl font-semibold text-slate-950">{gap === undefined ? 'Unknown' : money(gap, currency)}</p></Card></div>
    <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Programme and cost context</h2><p className="mt-2 text-sm text-slate-600">{programme && institution ? `${programme.name} at ${institution.name}` : 'Choose a tracked university application.'}</p>{cost?.amount === undefined ? <p className="mt-3 text-sm text-slate-700">Current tuition not indexed. Use the exact official fee page or calculator before relying on this plan.</p> : <p className="mt-3 text-sm text-slate-700">{cost.amountBasis}. Additional costs are not included unless explicitly stated.</p>}<label className="mt-4 block max-w-xs text-sm font-medium text-slate-700">Personal/family contribution (optional)<input type="number" min="0" value={contribution || ''} onChange={(event) => persistContribution(event.target.value ? Number(event.target.value) : 0)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label><p className="mt-2 text-xs text-slate-500">This private planning value is never inferred from your school, suburb or profile.</p></Card>
  </main>
}