import Link from 'next/link'
import { ArrowLeft, Globe2 } from 'lucide-react'
import { notFound } from 'next/navigation'
import { CountryBrowser } from '@/components/universities/country-browser'
import { Card } from '@/components/ui/card'
import { getCountryCatalogue, getCountryCoverage } from '@/lib/universities/catalog'

export default function CountryPage({ params }: { params: { countryCode: string } }) {
  const catalogue = getCountryCatalogue(params.countryCode)
  if (!catalogue) notFound()
  const coverage = getCountryCoverage(catalogue)

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/universities" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Back to Universities</Link>
      <header className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-sky-700"><Globe2 className="h-4 w-4" />{catalogue.region}</div>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{catalogue.name}</h1>
        <p className="mt-2 text-slate-600">Explore universities and programmes currently indexed in MuksBooks. Catalogue coverage: {catalogue.status}.</p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Catalogue coverage">
        <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Institutions</p><p className="mt-1 text-2xl font-semibold text-slate-950">{catalogue.institutions.length}</p><p className="text-xs text-slate-500">{coverage.institutionCoverage}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Programmes</p><p className="mt-1 text-2xl font-semibold text-slate-950">{catalogue.programmes.length}</p><p className="text-xs text-slate-500">{coverage.programmeCoverage}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Admissions</p><p className="mt-1 text-lg font-semibold capitalize text-slate-950">{coverage.admissionsCoverage}</p><p className="text-xs text-slate-500">Structured requirements</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Freshness</p><p className="mt-1 text-lg font-semibold capitalize text-slate-950">{coverage.sourceFreshness}</p><p className="text-xs text-slate-500">Official source checks</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Overall</p><p className="mt-1 text-lg font-semibold capitalize text-slate-950">{coverage.overall}</p><p className="text-xs text-slate-500">Not a completeness claim</p></Card>
      </section>
      <CountryBrowser catalogue={catalogue} />
    </main>
  )
}
