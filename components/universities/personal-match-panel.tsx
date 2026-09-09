'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getLearnerProfile, type LearnerProfile } from '@/lib/learner/store'
import { matchProgramme, resolveApplicantContext } from '@/lib/universities/matching'
import type { Institution, Programme } from '@/lib/universities/types'

export function PersonalMatchPanel({ institution, programme }: { institution: Institution; programme: Programme }) {
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const loaded = getLearnerProfile()
    setProfile(loaded.onboardingCompleted || loaded.subjects.length ? loaded : null)
    setLoaded(true)
  }, [])

  if (!loaded) return <Card className="p-5 text-sm text-slate-600">Loading your comparison…</Card>

  const planning = profile?.universityPlanning ?? {
    citizenships: [], residenceCountry: '', preferredCountries: [], studyAreas: [], priorities: [], englishTests: []
  }
  const match = matchProgramme(programme, profile, planning)
  const applicant = resolveApplicantContext(profile, planning, institution.country)

  return (
    <Card className="space-y-4 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Your match</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">{match.title}</h2>
      </div>
      {match.reasons.map((reason) => <p key={reason} className="flex gap-2 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{reason}</p>)}
      {match.checks.map((check) => <p key={check} className="flex gap-2 text-sm text-slate-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />{check}</p>)}
      <div className="border-t border-slate-200 pt-4">
        <p className="text-sm font-semibold text-slate-900">Applicant context</p>
        <p className="mt-1 text-sm text-slate-600">{applicant.explanation}</p>
      </div>
      {!profile ? <Link href="/settings"><Button type="button" variant="outline">Personalise your results</Button></Link> : null}
    </Card>
  )
}
