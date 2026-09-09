import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, CalendarDays, CircleDollarSign } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TestDeadlinePlannerButton } from '@/components/universities/test-deadline-planner-button'
import { ADMISSIONS_TEST_FEES, ADMISSIONS_TEST_SESSIONS, ADMISSIONS_TESTS } from '@/lib/universities/admissions-data'

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export default function AdmissionsTestPage({ params }: { params: { testId: string } }) {
  const test = ADMISSIONS_TESTS.find((entry) => entry.id.toLowerCase() === params.testId.toLowerCase())
  if (!test) notFound()
  const today = new Date().toISOString().slice(0, 10)
  const sessions = ADMISSIONS_TEST_SESSIONS.filter((session) => session.test === test.id && session.registrationDeadline.slice(0, 10) >= today)
  const fees = ADMISSIONS_TEST_FEES.filter((fee) => fee.test === test.id && fee.validFrom <= today && fee.validUntil >= today)

  return <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/universities" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Universities</Link>
    <header className="border-b border-slate-200 pb-6"><p className="text-sm font-semibold uppercase text-sky-700">Admissions test</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">{test.name}</h1><p className="mt-2 max-w-2xl text-slate-600">{test.summary || `Official admissions test administered by ${test.provider}. Check the exact programme policy before booking.`}</p><p className="mt-2 text-sm text-slate-500">Official provider: {test.provider} • Last verified {formatDate(test.lastVerifiedAt || test.lastCheckedAt)}</p>{test.components?.length ? <p className="mt-3 text-sm text-slate-700"><strong>Components:</strong> {test.components.join(' • ')}</p> : null}<div className="mt-5 flex flex-wrap gap-3"><a href={test.bookingUrl} target="_blank" rel="noreferrer"><Button type="button">Book with {test.provider}<ArrowUpRight className="ml-2 h-4 w-4" /></Button></a><a href={test.officialUrl} target="_blank" rel="noreferrer"><Button type="button" variant="secondary">Official test information<ArrowUpRight className="ml-2 h-4 w-4" /></Button></a>{test.preparationUrl ? <a href={test.preparationUrl} target="_blank" rel="noreferrer"><Button type="button" variant="secondary">Official preparation<ArrowUpRight className="ml-2 h-4 w-4" /></Button></a> : null}</div></header>
    <Card className="p-5"><h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950"><CalendarDays className="h-5 w-5 text-sky-700" />Current verified sessions</h2>{sessions.length ? <div className="mt-4 divide-y divide-slate-200">{sessions.map((session) => <div key={session.id} className="py-4 first:pt-0 last:pb-0"><p className="font-semibold text-slate-950">{session.label}</p><p className="mt-1 text-sm text-slate-600">Testing: {formatDate(session.testStartsAt)} to {formatDate(session.testEndsAt)}</p><p className="mt-1 text-sm text-slate-600">Registration deadline: {formatDate(session.registrationDeadline)}</p><p className="mt-1 text-xs text-slate-500">Last verified {formatDate(session.source.lastVerifiedAt)}. Confirm availability with the provider before booking.</p><div className="flex flex-wrap items-center gap-3"><a href={session.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-700">Official date source <ArrowUpRight className="h-3.5 w-3.5" /></a><TestDeadlinePlannerButton testName={test.name} sessionLabel={session.label} registrationDeadline={session.registrationDeadline} /></div></div>)}</div> : <p className="mt-3 text-sm text-slate-600">No future session with a current registration deadline has passed the MuksBooks review gate. This does not mean the test is unavailable.</p>}{test.bookingNote ? <p className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600">{test.bookingNote}</p> : null}</Card>
    <Card className="p-5"><h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950"><CircleDollarSign className="h-5 w-5 text-sky-700" />Current verified fees</h2>{fees.length ? <div className="mt-4 divide-y divide-slate-200">{fees.map((fee) => <div key={fee.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"><div><p className="font-semibold text-slate-950">{fee.regionLabel}</p><p className="text-xs text-slate-500">Verified for {formatDate(fee.validFrom)} to {formatDate(fee.validUntil)}</p></div><p className="text-lg font-semibold text-slate-950">{fee.currency} {fee.amount}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-600">No location-specific fee is verified as current in MuksBooks. Confirm the amount in the official booking flow before paying.</p>}</Card>
    <p className="text-xs text-slate-500">Dates, seats, and fees can change. MuksBooks only displays reviewed official records and does not book tests or collect payment.</p>
  </main>
}