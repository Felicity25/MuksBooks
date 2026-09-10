import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TRUSTED_CURRICULUM_SOURCES, checkCurriculumSources } from '@/lib/learner/curriculum-source-monitor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET || process.env.LEARNER_RESOURCES_CRON_SECRET || ''
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  return Boolean(expected && provided === expected)
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const client = serviceClient()
  let sources = TRUSTED_CURRICULUM_SOURCES
  if (client) {
    const { data } = await client.from('learner_curriculum_source_checks').select('source_id,fingerprint')
    const fingerprints = new Map((data || []).map((row) => [String(row.source_id), typeof row.fingerprint === 'string' ? row.fingerprint : undefined]))
    sources = sources.map((source) => ({ ...source, previousFingerprint: fingerprints.get(source.id) }))
  }

  const { checks, candidates } = await checkCurriculumSources(sources)
  let persistence: 'cloud' | 'static-fallback' = 'static-fallback'
  let persistenceError: string | undefined
  if (client) {
    const sourceById = new Map(sources.map((source) => [source.id, source]))
    const { error: checkError } = await client.from('learner_curriculum_source_checks').upsert(checks.map((check) => ({
      source_id: check.sourceId,
      source_url: check.sourceUrl,
      final_url: check.finalUrl || null,
      expected_domain: sourceById.get(check.sourceId)?.expectedDomain || '',
      status: check.status,
      http_status: check.httpStatus || null,
      fingerprint: check.fingerprint || null,
      changed: check.changed,
      reason: check.reason,
      checked_at: check.checkedAt
    })), { onConflict: 'source_id' })
    const { error: candidateError } = candidates.length ? await client.from('learner_curriculum_source_candidates').upsert(candidates.map((candidate) => ({ source_id: candidate.sourceId, source_url: candidate.sourceUrl, final_url: candidate.finalUrl, previous_fingerprint: candidate.previousFingerprint || null, candidate_fingerprint: candidate.candidateFingerprint, reason: candidate.reason, review_status: 'NEEDS_REVIEW', detected_at: candidate.detectedAt })), { onConflict: 'source_id,candidate_fingerprint', ignoreDuplicates: true }) : { error: null }
    if (!checkError && !candidateError) persistence = 'cloud'
    else persistenceError = checkError?.message || candidateError?.message
  }

  const totals = { active: checks.filter((check) => check.status === 'ACTIVE').length, needsReview: checks.filter((check) => check.status === 'NEEDS_REVIEW').length, broken: checks.filter((check) => check.status === 'BROKEN').length }
  return NextResponse.json({ ok: totals.broken === 0, checkedAt: new Date().toISOString(), persistence, persistenceError, totals, candidates: candidates.length, checks })
}