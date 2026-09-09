'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ProgrammeActions } from './programme-actions'
import type { Institution, Programme } from '@/lib/universities/types'

export function InstitutionProgrammeBrowser({ institution, programmes }: { institution: Institution; programmes: Programme[] }) {
  const [query, setQuery] = useState('')
  const [studyArea, setStudyArea] = useState('All')
  const studyAreas = ['All', ...Array.from(new Set(programmes.flatMap((programme) => programme.studyAreas))).sort()]
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return programmes.filter((programme) => {
      if (studyArea !== 'All' && !programme.studyAreas.includes(studyArea)) return false
      if (!normalized) return true
      return [programme.name, programme.normalizedName, programme.faculty, programme.department, ...programme.studyAreas, ...programme.tags].filter(Boolean).join(' ').toLowerCase().includes(normalized)
    })
  }, [programmes, query, studyArea])

  return <div className="space-y-4">
    <Card className="grid gap-3 p-4 md:grid-cols-[1fr_240px]"><label className="text-sm font-medium text-slate-700">Search programmes<span className="mt-1 flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3"><Search className="h-4 w-4 text-sky-700" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder="Course, faculty or subject" /></span></label><label className="text-sm font-medium text-slate-700">Study area<select value={studyArea} onChange={(event) => setStudyArea(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">{studyAreas.map((area) => <option key={area}>{area}</option>)}</select></label></Card>
    <p className="text-sm text-slate-600">{filtered.length} of {programmes.length} indexed programme{programmes.length === 1 ? '' : 's'}</p>
    <div className="grid gap-4 md:grid-cols-2">{filtered.map((programme) => <Card key={programme.id} className="space-y-3 p-5"><div><Link href={`/universities/${institution.id}/${programme.id}`} className="text-lg font-semibold text-slate-950 hover:text-sky-700">{programme.name}</Link><p className="mt-1 text-sm text-slate-600">{programme.degreeType}{programme.duration ? ` • ${programme.duration}` : ''}</p></div><div className="flex flex-wrap gap-2">{programme.studyAreas.map((area) => <span key={area} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">{area}</span>)}</div><p className="text-xs text-slate-500">{programme.confidenceStatus === 'VERIFIED_OFFICIAL' ? 'Admissions data verified from an official source' : programme.confidenceStatus === 'AUTO_EXTRACTED_OFFICIAL' ? 'Candidate programme found on an official source; details need review' : 'Official details need review'}</p><ProgrammeActions programmeId={programme.id} institutionId={institution.id} /></Card>)}</div>
    {!filtered.length ? <Card className="p-5 text-sm text-slate-600">No indexed programmes match these filters. Use the official course finder for the complete current catalogue.</Card> : null}
  </div>
}
