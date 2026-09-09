'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, ExternalLink, WalletCards } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { getLearnerProfile, type LearnerProfile } from '@/lib/learner/store'
import { getFundingEligibility, selectProgrammeCost } from '@/lib/universities/funding-domain'
import { getFundingForProgramme, PROGRAMME_COSTS } from '@/lib/universities/funding-data'
import type { ApplicantType, Institution, Programme } from '@/lib/universities/types'

const label = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const money = (amount: number, currency: string) => new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)

export function ProgrammeFundingPanel({ institution, programme }: { institution: Institution; programme: Programme }) {
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [applicantType, setApplicantType] = useState<ApplicantType>('UNCERTAIN')
  useEffect(() => setProfile(getLearnerProfile()), [])
  const opportunities = getFundingForProgramme(institution.id, programme.id, programme.studyAreas)
    .filter((opportunity) => !opportunity.eligibleDestinationCountries.length || opportunity.eligibleDestinationCountries.includes(institution.country))
  const cost = applicantType === 'UNCERTAIN' ? undefined : selectProgrammeCost(PROGRAMME_COSTS, { institutionId: institution.id, programmeId: programme.id, academicYear: 2027, applicantType })

  return <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950"><WalletCards className="h-5 w-5 text-emerald-700" />Tuition &amp; funding</h2><p className="mt-1 text-sm text-slate-600">Applicant context controls which fees and government support are relevant.</p></div><label className="text-sm font-medium text-slate-700">Applicant type<select value={applicantType} onChange={(event) => setApplicantType(event.target.value as ApplicantType)} className="ml-2 h-9 rounded-md border border-slate-300 bg-white px-2"><option value="UNCERTAIN">Not sure</option><option value="DOMESTIC">Domestic</option><option value="INTERNATIONAL">International</option></select></label></div>
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">{cost?.amount !== undefined ? <><p className="text-sm font-semibold text-slate-950">{money(cost.amount, cost.currency)}</p><p className="mt-1 text-sm text-slate-600">{cost.amountBasis}</p></> : cost?.rangeMin !== undefined && cost.rangeMax !== undefined ? <><p className="text-sm font-semibold text-slate-950">{money(cost.rangeMin, cost.currency)}–{money(cost.rangeMax, cost.currency)}</p><p className="mt-1 text-sm text-slate-600">Published range · {cost.amountBasis}</p></> : <><p className="text-sm font-semibold text-slate-950">Current tuition not indexed</p><p className="mt-1 text-sm text-slate-600">MuksBooks will not substitute a domestic fee, old fee, or unrelated course estimate.</p></>}{cost ? <a href={cost.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-700">Open official fee page <ExternalLink className="h-3.5 w-3.5" /></a> : <a href={programme.officialProgrammeUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-700">Contact university / check course fees <ExternalLink className="h-3.5 w-3.5" /></a>}</div>
    <div className="mt-4 space-y-3">{opportunities.slice(0, 3).map((opportunity) => { const match = getFundingEligibility(opportunity, { learnerProfile: profile, destinationCountry: institution.country, institutionId: institution.id, programme, applicantType, studyLevel: 'BACHELOR' }); return <div key={opportunity.id} className="border-t border-slate-200 pt-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold text-slate-900">{opportunity.name}</p><p className="mt-1 text-xs text-slate-500">{label(opportunity.repaymentType)} · {label(match.state)}</p></div><Link href={`/universities/funding/${opportunity.id}?programmeId=${programme.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-sky-700">Review <ArrowRight className="h-4 w-4" /></Link></div><p className="mt-1 text-sm text-slate-600">{match.reasons[0] || match.missing[0] || match.checks[0]}</p></div> })}{!opportunities.length ? <p className="text-sm text-slate-600">No programme-relevant opportunity is indexed yet. Explore other home-country, destination-country and external funding.</p> : null}</div>
    <Link href="/universities/funding" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">Explore Scholarships &amp; Funding <ArrowRight className="h-4 w-4" /></Link>
  </Card>
}