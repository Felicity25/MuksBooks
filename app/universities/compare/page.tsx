'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getInstitution, getProgramme } from '@/lib/universities/catalog'
import { universityStorage } from '@/lib/universities/storage'

export default function CompareProgrammesPage() {
  const { isGuest, settings, saveSettings } = useAuth()
  const [programmeIds, setProgrammeIds] = useState<string[]>([])

  useEffect(() => setProgrammeIds(isGuest ? universityStorage.getCompare() : settings.universityCompare), [isGuest, settings.universityCompare])

  const remove = (programmeId: string) => {
    const next = programmeIds.filter((id) => id !== programmeId)
    if (isGuest) universityStorage.saveCompare(next)
    else void saveSettings({ universityCompare: next })
    setProgrammeIds(next)
  }

  const records = programmeIds.flatMap((id) => {
    const programme = getProgramme(id)
    const institution = programme ? getInstitution(programme.institutionId) : undefined
    return programme && institution ? [{ programme, institution }] : []
  })

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/universities" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Back to Universities</Link>
      <header><h1 className="text-3xl font-semibold text-slate-950">Compare programmes</h1><p className="mt-2 text-slate-600">Compare your selected options using published information. Scroll across to review larger comparison sets. No universal ranking is applied.</p></header>
      {!records.length ? <Card className="p-6 text-sm text-slate-600">Add programmes from search or a programme page to compare them here.</Card> : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-[760px] w-full border-collapse text-left text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="p-3 font-semibold text-slate-700">Field</th>{records.map(({ programme }) => <th key={programme.id} className="min-w-56 p-3"><div className="flex items-start justify-between gap-2"><span>{programme.name}</span><button type="button" onClick={() => remove(programme.id)} aria-label={`Remove ${programme.name} from comparison`} className="rounded p-1 hover:bg-slate-200"><X className="h-4 w-4" /></button></div></th>)}</tr></thead>
            <tbody>
              {[
                ['Institution', (record: typeof records[number]) => record.institution.name],
                ['Country', (record: typeof records[number]) => `${record.institution.city}, ${record.institution.country}`],
                ['Qualification', (record: typeof records[number]) => record.programme.degreeType],
                ['Duration', (record: typeof records[number]) => record.programme.duration ?? 'Check official course'],
                ['Study areas', (record: typeof records[number]) => record.programme.studyAreas.join(', ')],
                ['Academic requirements', (record: typeof records[number]) => record.programme.requirements?.map((item) => `${item.curriculum}: ${item.minimumOverall ?? item.notes ?? 'See source'}`).join('; ') ?? 'Not yet structured'],
                ['Subject prerequisites', (record: typeof records[number]) => record.programme.prerequisiteSubjects.join(', ') || 'Check official course'],
                ['English', (record: typeof records[number]) => record.programme.englishRequirements?.map((item) => `${item.test}${item.overall ? ` ${item.overall}` : ''}`).join(', ') ?? 'Not yet assessed']
              ].map(([label, value]) => <tr key={String(label)} className="border-b border-slate-100 align-top"><th className="p-3 font-medium text-slate-700">{String(label)}</th>{records.map((record) => <td key={`${String(label)}-${record.programme.id}`} className="p-3 text-slate-600">{(value as (record: typeof records[number]) => string)(record)}</td>)}</tr>)}
              <tr><th className="p-3 font-medium text-slate-700">Official course</th>{records.map(({ programme }) => <td key={programme.id} className="p-3"><a href={programme.officialProgrammeUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="gap-2">Open <ExternalLink className="h-4 w-4" /></Button></a></td>)}</tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
