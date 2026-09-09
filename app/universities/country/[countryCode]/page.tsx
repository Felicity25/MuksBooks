import Link from 'next/link'
import { ArrowLeft, Globe2 } from 'lucide-react'
import { notFound } from 'next/navigation'
import { CountryBrowser } from '@/components/universities/country-browser'
import { getCountryCatalogue } from '@/lib/universities/catalog'

export default function CountryPage({ params }: { params: { countryCode: string } }) {
  const catalogue = getCountryCatalogue(params.countryCode)
  if (!catalogue) notFound()

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/universities" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Back to Universities</Link>
      <header className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-sky-700"><Globe2 className="h-4 w-4" />{catalogue.region}</div>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{catalogue.name}</h1>
        <p className="mt-2 text-slate-600">Explore universities and programmes currently indexed in MuksBooks. Catalogue coverage: {catalogue.status}.</p>
      </header>
      <CountryBrowser catalogue={catalogue} />
    </main>
  )
}
