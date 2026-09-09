import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { buildUniversityReviewQueue, getUniversityReviewDiagnostics, type ReviewDecisionAction } from '@/lib/universities/review-queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(request: NextRequest) {
  const secret = process.env.UNIVERSITIES_REVIEW_SECRET
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`)
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
}

async function decisions() {
  const client = serviceClient()
  if (!client) return { rows: [], storageReady: false }
  const { data, error } = await client.from('university_review_decisions').select('*').order('updated_at', { ascending: false })
  if (error) return { rows: [], storageReady: false, storageError: error.message }
  return { rows: data || [], storageReady: true }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const queue = buildUniversityReviewQueue()
  const stored = await decisions()
  const decidedIds = new Set(stored.rows.map((row: { candidate_id: string }) => row.candidate_id))
  return NextResponse.json({
    ok: true,
    diagnostics: { ...getUniversityReviewDiagnostics(), decisions: stored.rows.length, pending: queue.filter((item) => !decidedIds.has(item.id)).length },
    candidates: queue.filter((item) => !decidedIds.has(item.id)),
    decisions: stored.rows,
    storageReady: stored.storageReady,
    storageError: stored.storageError,
    message: 'Extracted candidates remain review-gated. Decisions do not automatically rewrite canonical catalogue records.'
  })
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null) as { candidateId?: string; action?: ReviewDecisionAction; mergeTargetId?: string; note?: string; reviewerId?: string } | null
  const action = body?.action
  const candidate = buildUniversityReviewQueue().find((item) => item.id === body?.candidateId)
  if (!candidate || !action || !['APPROVE', 'REJECT', 'MERGE'].includes(action)) return NextResponse.json({ ok: false, error: 'A valid candidate and decision are required.' }, { status: 400 })
  if (!body?.reviewerId?.trim()) return NextResponse.json({ ok: false, error: 'Reviewer identity is required for the audit log.' }, { status: 400 })
  if (action === 'MERGE' && !candidate.canonicalMatches.some((match) => match.id === body?.mergeTargetId)) return NextResponse.json({ ok: false, error: 'Merge requires one of the candidate canonical matches.' }, { status: 400 })
  const client = serviceClient()
  if (!client) return NextResponse.json({ ok: false, error: 'Private review storage is not configured.' }, { status: 503 })
  const { data, error } = await client.from('university_review_decisions').insert({
    candidate_id: candidate.id,
    institution_id: candidate.institutionId,
    candidate_type: candidate.candidateType,
    action,
    merge_target_id: action === 'MERGE' ? body?.mergeTargetId : null,
    reviewer_note: body?.note?.trim() || null,
    reviewer_id: body.reviewerId.trim(),
    candidate_payload: candidate,
    source_url: candidate.sourceUrl,
    source_fingerprint: candidate.sourceFingerprint,
    updated_at: new Date().toISOString()
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, decision: data, canonicalCatalogueChanged: false })
}