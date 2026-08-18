import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { cleanupBogusUnit, inspectBogusUnits } from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
  const candidates = await inspectBogusUnits(user.id)
  return NextResponse.json({ ok: true, dryRun: true, candidates: candidates ?? [], migrationRequired: candidates === null })
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (body?.confirm !== true || !body?.unitId) return NextResponse.json({ ok: false, error: 'unitId and confirm: true are required' }, { status: 400 })
  const result = await cleanupBogusUnit(user.id, String(body.unitId))
  return NextResponse.json(result, { status: result.ok ? 200 : 409 })
}