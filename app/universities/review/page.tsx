'use client'

import { useState } from 'react'
import { Check, GitMerge, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { SectionShell } from '@/components/section-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Candidate = { id: string; institutionName: string; countryCode: string; candidateType: string; candidateValue: string; faculty: string; pageNumber: number; evidence: string; sourceUrl: string; duplicateSuspicion: string; canonicalMatches: Array<{ id: string; name: string }> }
type ReviewData = { diagnostics: Record<string, number>; candidates: Candidate[]; storageReady: boolean; storageError?: string; message: string }

export default function UniversityReviewPage() {
  const [secret, setSecret] = useState('')
  const [reviewerId, setReviewerId] = useState('')
  const [data, setData] = useState<ReviewData | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = async () => {
    setError('')
    const response = await fetch('/api/universities/review', { headers: { authorization: `Bearer ${secret}` } })
    const payload = await response.json()
    if (!response.ok) return setError(payload.error || 'Review queue could not be loaded.')
    setData(payload)
  }

  const decide = async (candidate: Candidate, action: 'APPROVE' | 'REJECT' | 'MERGE', mergeTargetId?: string) => {
    setBusyId(candidate.id)
    setError('')
    const response = await fetch('/api/universities/review', { method: 'POST', headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' }, body: JSON.stringify({ candidateId: candidate.id, action, mergeTargetId, reviewerId }) })
    const payload = await response.json()
    setBusyId('')
    if (!response.ok) return setError(payload.error || 'Decision could not be saved.')
    setData((current) => current ? { ...current, candidates: current.candidates.filter((item) => item.id !== candidate.id) } : current)
  }

  return <SectionShell title="University data review" description="Internal review queue for official-source candidates. No decision automatically rewrites canonical data." contentClassName="space-y-5">
    <Card className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1 text-sm font-medium text-slate-700">Reviewer ID<input value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label><label className="flex-1 text-sm font-medium text-slate-700">Review secret<input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label><Button onClick={load} disabled={!secret || !reviewerId.trim()}><RefreshCw className="mr-2 h-4 w-4" />Load queue</Button></div>{error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}</Card>
    {data ? <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(data.diagnostics).map(([label, value]) => <Card key={label} className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label.replace(/([A-Z])/g, ' $1')}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p></Card>)}</div>
      {!data.storageReady ? <Card className="border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><ShieldCheck className="mr-2 inline h-4 w-4" />Decision storage is unavailable. Apply the review migration and configure the service role before reviewing. {data.storageError}</Card> : null}
      <div className="space-y-3">{data.candidates.slice(0, 100).map((candidate) => <Card key={candidate.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold uppercase text-sky-700">{candidate.candidateType.replace(/_/g, ' ')} · {candidate.countryCode}</p><h2 className="mt-1 font-semibold text-slate-950">{candidate.candidateValue}</h2><p className="mt-1 text-sm text-slate-500">{candidate.institutionName} · {candidate.faculty} · page {candidate.pageNumber}</p></div><span className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600">{candidate.duplicateSuspicion} duplicate</span></div><p className="mt-4 rounded bg-slate-50 p-3 text-sm text-slate-700">{candidate.evidence}</p><a href={candidate.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-medium text-sky-700 underline">Open official source</a><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => decide(candidate, 'APPROVE')} disabled={busyId === candidate.id || !data.storageReady || !reviewerId.trim()}><Check className="mr-1 h-4 w-4" />Approve</Button><Button size="sm" variant="outline" onClick={() => decide(candidate, 'REJECT')} disabled={busyId === candidate.id || !data.storageReady || !reviewerId.trim()}><X className="mr-1 h-4 w-4" />Reject</Button>{candidate.canonicalMatches.map((match) => <Button key={match.id} size="sm" variant="outline" onClick={() => decide(candidate, 'MERGE', match.id)} disabled={busyId === candidate.id || !data.storageReady || !reviewerId.trim()}><GitMerge className="mr-1 h-4 w-4" />Merge into {match.name}</Button>)}</div></Card>)}{!data.candidates.length ? <Card className="p-8 text-center text-sm text-slate-600">No pending candidates.</Card> : null}</div></> : null}
  </SectionShell>
}