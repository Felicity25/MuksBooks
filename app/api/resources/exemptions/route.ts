import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/supabase/server'
import {
  VERIFIED_MONASH_EXEMPTION_SNAPSHOT,
  verifyCurrentMonashExemptionSource,
  type UnitResultInput
} from '@/lib/resources/exemptions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
}

function isMissingRelation(error: unknown) {
  const message = String((error as { message?: string })?.message || '').toLowerCase()
  return message.includes('does not exist') || message.includes('42p01') || message.includes('42703')
}

async function listResults(userId: string) {
  const client = createSupabaseServerClient()
  if (!client) return []
  const { data, error } = await client
    .from('user_unit_results')
    .select('unit_code, mark, is_hypothetical, updated_at')
    .eq('user_id', userId)
    .order('unit_code')
  if (error) {
    if (!isMissingRelation(error)) console.error('[Resources] Unit results failed:', error.message)
    return []
  }
  return data || []
}

export async function GET() {
  const user = await getAuthenticatedUser()
  const results = user ? await listResults(user.id) : []
  return NextResponse.json({
    ok: true,
    snapshot: VERIFIED_MONASH_EXEMPTION_SNAPSHOT,
    results,
    authenticated: Boolean(user)
  }, { headers: { 'Cache-Control': 'private, max-age=300' } })
}

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Authentication required.', code: 'UNAUTHENTICATED' }, { status: 401 })
  const client = createSupabaseServerClient()
  if (!client) return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 })

  const body = await request.json().catch(() => null) as { results?: UnitResultInput[] } | null
  const results = body?.results
  if (!Array.isArray(results) || results.length > 50) return NextResponse.json({ ok: false, error: 'A valid results array is required.' }, { status: 400 })
  const normalized = results.map((result) => ({
    user_id: user.id,
    unit_code: String(result.unitCode || '').toUpperCase().trim(),
    mark: result.mark === null ? null : Number(result.mark),
    is_hypothetical: result.hypothetical !== false
  }))
  if (normalized.some((result) => !/^[A-Z]{3}\d{4}$/.test(result.unit_code) || (result.mark !== null && (!Number.isFinite(result.mark) || result.mark < 0 || result.mark > 100)))) {
    return NextResponse.json({ ok: false, error: 'Every unit code and mark must be valid.' }, { status: 400 })
  }

  const { error } = await client.from('user_unit_results').upsert(normalized, { onConflict: 'user_id,unit_code' })
  if (error) return NextResponse.json({ ok: false, error: error.message, migrationRequired: isMissingRelation(error) }, { status: 500 })
  return NextResponse.json({ ok: true, results: await listResults(user.id) })
}

export async function POST() {
  try {
    const verification = await verifyCurrentMonashExemptionSource()
    const client = serviceClient()
    if (client) {
      const now = new Date(verification.checkedAt)
      const nextVerification = new Date(now)
      nextVerification.setUTCMonth(nextVerification.getUTCMonth() + 6)
      const { error } = await client.from('exemption_rule_snapshots').upsert({
        version: VERIFIED_MONASH_EXEMPTION_SNAPSHOT.version,
        source_url: VERIFIED_MONASH_EXEMPTION_SNAPSHOT.sourceUrl,
        source_page_date: VERIFIED_MONASH_EXEMPTION_SNAPSHOT.sourcePageDate,
        source_hash: verification.sourceDocumentHash,
        grade_source_url: VERIFIED_MONASH_EXEMPTION_SNAPSHOT.gradeSourceUrl,
        grade_source_date: VERIFIED_MONASH_EXEMPTION_SNAPSHOT.gradeSourceDate,
        grade_source_hash: verification.gradeDocumentHash,
        rule_signature: verification.ruleSignature,
        status: verification.status,
        rules: verification.rules,
        verified_at: verification.checkedAt,
        next_verification_at: nextVerification.toISOString(),
        verification_error: null
      }, { onConflict: 'version' })
      if (error && !isMissingRelation(error)) console.error('[Resources] Exemption verification persistence failed:', error.message)
    }
    return NextResponse.json({ ok: true, verification, snapshotStillActive: !verification.changed })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Official source verification failed.',
      snapshotStillActive: true,
      snapshot: VERIFIED_MONASH_EXEMPTION_SNAPSHOT
    }, { status: 502 })
  }
}