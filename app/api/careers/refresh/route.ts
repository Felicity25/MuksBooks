import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { refreshCareersCatalog } from '@/lib/careers/service'
import { isCareersCloudReady, refreshCareersCatalogSupabase } from '@/lib/careers/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function isAuthorized(request: Request) {
  const expected = process.env.CAREERS_CRON_SECRET || process.env.CRON_SECRET || ''
  if (!expected) return false
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  return provided === expected
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceClient = getServiceClient()
    if (serviceClient && await isCareersCloudReady(serviceClient)) {
      const summary = await refreshCareersCatalogSupabase(serviceClient)
      return NextResponse.json({ ok: true, mode: 'cloud', summary })
    }

    const summary = await refreshCareersCatalog()
    return NextResponse.json({ ok: true, mode: 'local', summary })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Careers refresh failed.'
    }, { status: 500 })
  }
}
