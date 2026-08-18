import { NextRequest, NextResponse } from 'next/server'
import { syncMassPulse } from '@/lib/mass/pipeline'
import { getMassSyncMode } from '@/lib/mass/schedule'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET || process.env.MASS_CRON_SECRET
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!expected) return NextResponse.json({ ok: false, error: 'MASS sync is not configured.' }, { status: 503 })
  if (provided !== expected) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const mode = getMassSyncMode(new Date()) || 'full'
  try { return NextResponse.json({ ok: true, ...(await syncMassPulse(mode)) }) } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Scheduled sync failed.' }, { status: 500 }) }
}