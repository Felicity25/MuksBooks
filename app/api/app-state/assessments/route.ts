import { NextRequest, NextResponse } from 'next/server'
import { createUserAssessment, deleteUserAssessment, listCloudAssessments } from '@/lib/supabase/documents-service'
import { ensureUserUnitForCode } from '@/lib/cloud/service'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function mapAssessment(assessment: any) {
  return {
    id: assessment.id,
    unitId: assessment.unit_id,
    unitCode: assessment.units?.code || null,
    unitName: assessment.units?.name || null,
    name: assessment.name,
    assessmentType: assessment.assessment_type,
    weighting: assessment.weighting,
    dueDate: assessment.due_date,
    dueTimeKnown: Boolean(assessment.due_time_known),
    estimatedMinutes: assessment.estimated_minutes,
    notes: assessment.notes,
    status: assessment.status,
    source: assessment.source || 'manual'
  }
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }
  const assessments = await listCloudAssessments(user.id)
  return NextResponse.json({ ok: true, assessments: (assessments || []).map(mapAssessment) })
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const body = await request.json()
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const assessmentType = typeof body?.assessmentType === 'string' ? body.assessmentType.trim() : ''
  const courseCode = typeof body?.courseCode === 'string' ? body.courseCode.trim() : ''

  if (!name) return NextResponse.json({ ok: false, error: 'name is required' }, { status: 400 })
  if (!assessmentType) return NextResponse.json({ ok: false, error: 'assessmentType is required' }, { status: 400 })
  if (!courseCode) return NextResponse.json({ ok: false, error: 'courseCode is required' }, { status: 400 })

  const unit = await ensureUserUnitForCode(user.id, courseCode)
  if (!unit?.id) {
    return NextResponse.json({ ok: false, error: 'Could not resolve the unit for this assessment.' }, { status: 400 })
  }

  let dueDate: string | null = null
  let dueTimeKnown = false
  if (body?.dueDate) {
    const timePart = typeof body?.dueTime === 'string' && body.dueTime ? body.dueTime : '23:59'
    const composed = new Date(`${body.dueDate}T${timePart}:00`)
    if (!Number.isNaN(composed.getTime())) {
      dueDate = composed.toISOString()
      dueTimeKnown = Boolean(body?.dueTime)
    }
  }

  const weighting = body?.weighting !== undefined && body?.weighting !== null && body.weighting !== ''
    ? Number(body.weighting)
    : null
  const estimatedMinutes = body?.estimatedMinutes !== undefined && body?.estimatedMinutes !== null && body.estimatedMinutes !== ''
    ? Math.max(0, Math.round(Number(body.estimatedMinutes)))
    : null

  const result = await createUserAssessment(user.id, {
    unitId: unit.id,
    name,
    assessmentType,
    dueDate,
    dueTimeKnown,
    weighting: Number.isFinite(weighting) ? weighting : null,
    estimatedMinutes: Number.isFinite(estimatedMinutes as number) ? estimatedMinutes : null,
    notes: typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true, assessment: mapAssessment(result.assessment) })
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const assessmentId = searchParams.get('assessmentId')
  if (!assessmentId) {
    return NextResponse.json({ ok: false, error: 'assessmentId is required' }, { status: 400 })
  }

  const deleted = await deleteUserAssessment(user.id, assessmentId)
  if (!deleted) {
    return NextResponse.json({ ok: false, error: 'Assessment not found.' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
