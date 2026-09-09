'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { getLearnerProfile } from '@/lib/learner/store'
import { resolveApplicationRoute } from '@/lib/universities/application-domain'
import { resolveApplicantContext } from '@/lib/universities/matching'
import type { ApplicantType, Institution, Programme } from '@/lib/universities/types'

const APPLICANT_TYPES: Array<{ value: ApplicantType; label: string }> = [
  { value: 'DOMESTIC', label: 'Domestic' },
  { value: 'INTERNATIONAL', label: 'International' },
  { value: 'UNCERTAIN', label: 'Not sure' }
]

export function ProgrammeApplicationRoute({ institution, programme }: { institution: Institution; programme: Programme }) {
  const [applicantType, setApplicantType] = useState<ApplicantType>('UNCERTAIN')
  const [contextExplanation, setContextExplanation] = useState('Choose the context the university is likely to use for your application.')

  useEffect(() => {
    const profile = getLearnerProfile()
    const context = resolveApplicantContext(profile, profile.universityPlanning, institution.country)
    setApplicantType(context.likelyApplicantType)
    setContextExplanation(context.explanation)
  }, [institution.country])

  const route = resolveApplicationRoute(programme, institution, applicantType)

  return (
    <section className="border-t border-slate-200 pt-5" aria-labelledby="application-route-heading">
      <h2 id="application-route-heading" className="text-xl font-semibold text-slate-950">How to apply</h2>
      <div className="mt-3 inline-flex rounded-md border border-slate-300 bg-white p-1" aria-label="Applicant type">
        {APPLICANT_TYPES.map((option) => <button key={option.value} type="button" onClick={() => { setApplicantType(option.value); setContextExplanation('Applicant context selected for this programme view.') }} aria-pressed={applicantType === option.value} className={`h-9 px-3 text-sm font-medium ${applicantType === option.value ? 'rounded bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-950'}`}>{option.label}</button>)}
      </div>
      <p className="mt-3 text-sm text-slate-600">{contextExplanation}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div><p className="text-xs font-semibold uppercase text-slate-500">Application method</p><p className="mt-1 font-semibold text-slate-950">{route.method}</p></div>
        {route.url ? <a href={route.url} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-5 text-sm font-medium text-white hover:bg-[var(--primary-hover)]">{route.ctaLabel}<ArrowUpRight className="h-4 w-4" /></a> : null}
      </div>
      <p className="mt-3 text-xs text-slate-500">{route.explanation} Confirm the route and deadline on the official destination before submitting.</p>
    </section>
  )
}
