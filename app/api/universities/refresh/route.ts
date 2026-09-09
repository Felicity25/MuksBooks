import { NextRequest, NextResponse } from 'next/server'
import { FreshUniversityDataService } from '@/lib/universities/fresh-data-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.UNIVERSITIES_CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const service = new FreshUniversityDataService()
  const snapshot = service.snapshot()
  const requestedSourceId = request.nextUrl.searchParams.get('sourceId') || 'ucas-2027-deadlines'
  const source = snapshot.sources.find((item) => item.id === requestedSourceId)
  if (!source) return NextResponse.json({ ok: false, error: 'Unknown source.' }, { status: 404 })
  const refreshed = await service.refreshSource(source)
  if (refreshed.error) {
    return NextResponse.json({ ok: false, source: refreshed.source, error: refreshed.error, retainedPreviousValue: true }, { status: 502 })
  }
  return NextResponse.json({
    ok: true,
    checkedAt: refreshed.source.lastCheckedAt,
    source: refreshed.source,
    candidate: {
      ...refreshed.candidate,
      text: refreshed.candidate?.text.slice(0, 500)
    },
    registry: { sources: snapshot.sources.length, deadlines: snapshot.deadlines.length, resultsEvents: snapshot.resultsEvents.length, admissionsPolicies: snapshot.admissionsPolicies.length, testSessions: snapshot.testSessions.length, testFees: snapshot.testFees.length },
    message: 'Official source retrieved. Extracted data remains review-gated and has not replaced verified canonical values.'
  })
}
