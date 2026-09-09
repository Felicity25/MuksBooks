import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, Building2, MapPin } from 'lucide-react'
import { notFound } from 'next/navigation'
import { ProgrammeActions } from '@/components/universities/programme-actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getInstitution, getInstitutionProgrammes } from '@/lib/universities/catalog'

export default function InstitutionPage({ params }: { params: { institutionId: string } }) {
  const institution = getInstitution(params.institutionId)
  if (!institution) notFound()
  const programmes = getInstitutionProgrammes(institution.id)

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/universities" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Back to Universities</Link>
      <header className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4" />{institution.city}, {institution.country}</div>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{institution.name}</h1>
        <p className="mt-3 max-w-3xl text-slate-600">{institution.shortSummary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={institution.officialWebsite} target="_blank" rel="noreferrer"><Button type="button" variant="outline" className="gap-2">Official website <ArrowUpRight className="h-4 w-4" /></Button></a>
          {institution.admissionsUrl ? <a href={institution.admissionsUrl} target="_blank" rel="noreferrer"><Button type="button" className="gap-2">Admissions <ArrowUpRight className="h-4 w-4" /></Button></a> : null}
        </div>
      </header>

      <section aria-labelledby="programmes-heading">
        <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-sky-700" /><h2 id="programmes-heading" className="text-2xl font-semibold text-slate-950">Programmes currently indexed</h2></div>
        <p className="mt-1 text-sm text-slate-600">Coverage is expanding. Always confirm programme availability on the official university site.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {programmes.map((programme) => (
            <Card key={programme.id} className="space-y-3 p-5">
              <div><h3 className="text-lg font-semibold text-slate-950">{programme.name}</h3><p className="mt-1 text-sm text-slate-600">{programme.degreeType}{programme.duration ? ` • ${programme.duration}` : ''}</p></div>
              <div className="flex flex-wrap gap-2">{programme.studyAreas.map((area) => <span key={area} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{area}</span>)}</div>
              <ProgrammeActions programmeId={programme.id} institutionId={institution.id} />
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
