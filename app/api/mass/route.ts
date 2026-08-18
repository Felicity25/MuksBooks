import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { listMassPulse, syncMassPulse } from '@/lib/mass/pipeline'

export const runtime = 'nodejs'

function readClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
}

export async function GET(request: NextRequest) {
  try {
    const client = readClient()
    if (!client) return NextResponse.json({ ok: true, items: [], message: 'MASS Pulse storage is not configured.' })
    const categories = request.nextUrl.searchParams.get('categories')?.split(',').filter(Boolean) || []
    const items = await listMassPulse(client)
    return NextResponse.json({ ok: true, items: categories.length ? items.filter((item) => categories.includes(item.category)) : items }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } })
  } catch (error) {
    return NextResponse.json({ ok: false, items: [], error: error instanceof Error ? error.message : 'MASS Pulse unavailable.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const expected = process.env.MASS_CRON_SECRET || process.env.CRON_SECRET
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (expected && provided !== expected) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const mode = request.nextUrl.searchParams.get('mode') === 'delta' ? 'delta' : 'full'
  try { return NextResponse.json({ ok: true, ...(await syncMassPulse(mode)) }) } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Sync failed.' }, { status: 500 }) }
}