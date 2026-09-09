import Link from 'next/link'
import { ArrowRight, CalendarDays, CheckCircle2, CircleAlert, Landmark, Repeat2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDateInTimezone } from '@/lib/universities/application-domain'
import type { FundingEligibilityResult, FundingOpportunity } from '@/lib/universities/types'

const label = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export function FundingOpportunityCard({ opportunity, eligibility, saved, tracked, onToggleSave, onStart }: { opportunity: FundingOpportunity; eligibility?: FundingEligibilityResult; saved?: boolean; tracked?: boolean; onToggleSave?: () => void; onStart?: () => void }) {
  const statusTone = opportunity.repaymentType === 'NON_REPAYABLE' ? 'bg-emerald-50 text-emerald-800' : opportunity.repaymentType === 'REPAYABLE' ? 'bg-amber-50 text-amber-900' : 'bg-sky-50 text-sky-800'
  return <Card className="flex h-full flex-col p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-emerald-700">{label(opportunity.fundingType)}</p><h3 className="mt-1 text-lg font-semibold text-slate-950">{opportunity.name}</h3><p className="mt-1 text-sm text-slate-600">{opportunity.provider} · {opportunity.providerCountry}</p></div><span className={`rounded px-2 py-1 text-xs font-semibold ${statusTone}`}>{label(opportunity.repaymentType)}</span></div>
    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><Landmark className="h-3.5 w-3.5" />{label(opportunity.providerType)}</span>{opportunity.renewable ? <span className="inline-flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5" />Renewable, conditions apply</span> : null}{opportunity.applicationDeadline ? <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDateInTimezone(opportunity.applicationDeadline)}</span> : null}</div>
    {eligibility ? <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3"><p className="flex items-center gap-2 text-sm font-semibold text-slate-900">{['STRONG_POTENTIAL_MATCH', 'POTENTIAL_MATCH', 'POSSIBLE_MATCH'].includes(eligibility.state) ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <CircleAlert className="h-4 w-4 text-amber-700" />}{label(eligibility.state)}</p><p className="mt-1 text-sm text-slate-600">{eligibility.reasons[0] || eligibility.missing[0] || eligibility.checks[0] || 'Review the official criteria.'}</p></div> : null}
    <p className="mt-4 text-sm text-slate-600">{opportunity.coverage.join(' · ')}</p>
    <div className="mt-auto flex flex-wrap gap-2 pt-5"><Link href={`/universities/funding/${opportunity.id}`}><Button type="button" size="sm">View details <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>{onToggleSave ? <Button type="button" size="sm" variant="secondary" onClick={onToggleSave}>{saved ? 'Saved' : 'Save'}</Button> : null}{onStart ? <Button type="button" size="sm" variant="outline" onClick={onStart} disabled={tracked}>{tracked ? 'Tracking' : 'Start application'}</Button> : null}</div>
  </Card>
}