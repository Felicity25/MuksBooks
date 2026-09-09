'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { ProgrammeActions } from './programme-actions'
import { Card } from '@/components/ui/card'
import { searchUniversityCatalogue } from '@/lib/universities/catalog'
import type { CountryCatalogue } from '@/lib/universities/types'

export function CountryBrowser({ catalogue }: { catalogue: CountryCatalogue }) {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('All')
  const [studyArea, setStudyArea] = useState('All')
  const regions = ['All', ...Array.from(new Set(catalogue.institutions.map((institution) => institution.region))).sort()]
  const studyAreas = ['All', ...Array.from(new Set(catalogue.programmes.flatMap((programme) => programme.studyAreas))).sort()]
  const results = useMemo(() => searchUniversityCatalogue(query, { country: catalogue.name, region, studyArea }), [catalogue.name, query, region, studyArea])

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <label htmlFor="country-programme-search" className="text-sm font-semibold text-slate-900">Search within {catalogue.name}</label>
        <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 focus-within:ring-2 focus-within:ring-sky-600"><Search className="h-4 w-4 text-sky-700" /><input id="country-programme-search" value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent focus:outline-none" placeholder="Course, university, subject or city" /></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Province, state or nation<select value={region} onChange={(event) => setRegion(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Study area<select value={studyArea} onChange={(event) => setStudyArea(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">{studyAreas.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
      </Card>
      <section><h2 className="text-xl font-semibold text-slate-950">Institutions</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{catalogue.institutions.map((institution) => <Link key={institution.id} href={`/universities/${institution.id}`} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-sky-300"><span className="font-semibold text-slate-950">{institution.name}</span><span className="mt-1 block text-sm text-slate-600">{institution.city} • {institution.region}</span></Link>)}</div></section>
      <section><h2 className="text-xl font-semibold text-slate-950">Programmes</h2><p className="mt-1 text-sm text-slate-600">{results.length} indexed programme{results.length === 1 ? '' : 's'}</p><div className="mt-3 grid gap-4 lg:grid-cols-2">{results.map((result) => <Card key={result.programme.id} className="space-y-3 p-4"><div><Link href={`/universities/${result.institution.id}/${result.programme.id}`} className="font-semibold text-slate-950 hover:text-sky-700">{result.programme.name}</Link><p className="mt-1 text-sm text-slate-600">{result.institution.name} • {result.region}</p></div><ProgrammeActions programmeId={result.programme.id} institutionId={result.institution.id} /></Card>)}</div></section>
      <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Admissions overview</h2><p className="mt-2 text-sm text-slate-600">Requirements depend on curriculum, applicant context, programme and admissions cycle. MuksBooks only compares structured requirements when an official source is recorded; otherwise use the linked university admissions page.</p></Card>
    </div>
  )
}
