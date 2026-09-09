'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, WalletCards } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Card } from '@/components/ui/card'
import { FUNDING_DEADLINES, FUNDING_OPPORTUNITIES, getFundingOpportunity } from '@/lib/universities/funding-data'
import { fundingPlanTotals } from '@/lib/universities/funding-domain'
import { universityStorage } from '@/lib/universities/storage'
import type { FundingApplication } from '@/lib/universities/types'

export function FundingHomePulse() {
  const { isGuest, settings } = useAuth()
  const [guestFundingSaved, setGuestFundingSaved] = useState<string[]>([])
  const [guestFundingApplications, setGuestFundingApplications] = useState<FundingApplication[]>([])
  const [guestUniversityPlanningActive, setGuestUniversityPlanningActive] = useState(false)
  useEffect(() => {
    if (!isGuest) return
    setGuestFundingSaved(universityStorage.getFundingSaved())
    setGuestFundingApplications(universityStorage.getFundingApplications())
    setGuestUniversityPlanningActive(Boolean(universityStorage.getShortlist().length || universityStorage.getApplications().length))
  }, [isGuest])
  const fundingSaved = isGuest ? guestFundingSaved : settings.fundingSaved
  const fundingApplications = isGuest ? guestFundingApplications : settings.fundingApplications
  const planningActive = (settings.academicMode === 'LEARNER' || isGuest) && Boolean((isGuest ? guestUniversityPlanningActive : settings.universityShortlist.length || settings.universityApplications.length) || fundingSaved.length || fundingApplications.length)
  const upcoming = useMemo(() => {
    const trackedIds = new Set([...fundingSaved, ...fundingApplications.map((application) => application.fundingOpportunityId).filter((id): id is string => Boolean(id))])
    return FUNDING_DEADLINES.filter((deadline) => trackedIds.has(deadline.fundingOpportunityId) && new Date(`${deadline.dueAt}T23:59:59Z`).getTime() >= Date.now()).sort((left, right) => left.dueAt.localeCompare(right.dueAt)).slice(0, 2)
  }, [fundingApplications, fundingSaved])
  if (!planningActive) return null
  const currencies = Array.from(new Set(fundingApplications.map((application) => application.awardCurrency).filter((currency): currency is string => Boolean(currency))))
  const totals = currencies.map((currency) => ({ currency, ...fundingPlanTotals(fundingApplications, FUNDING_OPPORTUNITIES, currency) }))
  return <Card className="border-emerald-200 bg-emerald-50/40 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-emerald-700">Funding</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{fundingSaved.length} saved · {fundingApplications.length} application{fundingApplications.length === 1 ? '' : 's'}</h2></div><WalletCards className="h-5 w-5 text-emerald-700" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{upcoming.map((deadline) => <div key={deadline.id} className="flex gap-2 text-sm"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><div><p className="font-medium text-slate-900">{getFundingOpportunity(deadline.fundingOpportunityId)?.name}</p><p className="text-slate-600">Deadline {new Date(`${deadline.dueAt}T12:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</p></div></div>)}</div>{totals.length ? <p className="mt-4 text-sm text-slate-700">Confirmed: {totals.map((item) => `${item.currency} ${item.confirmed.toLocaleString()}`).join(' · ')}. Potential funding remains separate.</p> : null}<Link href="/universities/funding" className="mt-4 inline-flex text-sm font-semibold text-emerald-800">Open Scholarships &amp; Funding</Link></Card>
}