import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import {
  listScheduleEntries,
  upsertScheduleEntry,
  deleteScheduleEntry,
  replaceUnitSchedule,
  getCloudUnit,
  type ScheduleEntryInput
} from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'

function parseEntry(body: any): ScheduleEntryInput | null {
  const unitId = String(body?.unitId || '').trim()
  const weekNumber = Number(body?.weekNumber)
  const topic = String(body?.topic || '').trim()
  if (!unitId || !Number.isFinite(weekNumber) || !topic) return null

  return {
    id: body?.id ? String(body.id) : undefined,
    unitId,
    weekNumber,
    startDate: body?.startDate ?? null,
    endDate: body?.endDate ?? null,
    topic,
    additionalTopics: Array.isArray(body?.additionalTopics) ? body.additionalTopics.map(String) : [],
    activities: Array.isArray(body?.activities) ? body.activities.map(String) : [],
    assessmentReferences: Array.isArray(body?.assessmentReferences) ? body.assessmentReferences.map(String) : [],
    periodKind: String(body?.periodKind || 'week'),
    periodLabel: body?.periodLabel ? String(body.periodLabel) : `Week ${weekNumber}`,
    parser: body?.parser ? String(body.parser) : null,
    originalValues: body?.originalValues && typeof body.originalValues === 'object' ? body.originalValues : null,
    wasEdited: Boolean(body?.wasEdited),
    notes: body?.notes ?? null,
    sourceUploadId: body?.sourceUploadId ?? null,
    extractionConfidence: typeof body?.extractionConfidence === 'number' ? body.extractionConfidence : null,
    isBreak: Boolean(body?.isBreak),
    sortOrder: typeof body?.sortOrder === 'number' ? body.sortOrder : undefined
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const unitId = searchParams.get('unitId')
  if (!unitId) {
    return NextResponse.json({ ok: false, error: 'unitId is required' }, { status: 400 })
  }

  const unit = await getCloudUnit(user.id, unitId)
  if (!unit) {
    return NextResponse.json({ ok: false, error: 'Unit not found' }, { status: 404 })
  }

  const entries = await listScheduleEntries(user.id, unitId)
  return NextResponse.json({ ok: true, entries: entries ?? [] })
}

/** Create or update a single week entry. */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  // Bulk save: { unitId, entries: [...] } replaces the whole schedule (used after preview/edit).
  if (Array.isArray(body?.entries)) {
    const unitId = String(body?.unitId || '').trim()
    if (!unitId) return NextResponse.json({ ok: false, error: 'unitId is required' }, { status: 400 })

    const unit = await getCloudUnit(user.id, unitId)
    if (!unit) return NextResponse.json({ ok: false, error: 'Unit not found' }, { status: 404 })

    const parsed = body.entries
      .map((entry: any) => parseEntry({ ...entry, unitId }))
      .filter((entry: ScheduleEntryInput | null): entry is ScheduleEntryInput => entry !== null)

    const result = await replaceUnitSchedule(user.id, unitId, parsed)
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    return NextResponse.json({ ok: true, entries: result.entries })
  }

  const entry = parseEntry(body)
  if (!entry) {
    return NextResponse.json({ ok: false, error: 'unitId, weekNumber and topic are required' }, { status: 400 })
  }

  const unit = await getCloudUnit(user.id, entry.unitId)
  if (!unit) return NextResponse.json({ ok: false, error: 'Unit not found' }, { status: 404 })

  const result = await upsertScheduleEntry(user.id, entry)
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true, entry: result.entry })
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const entryId = searchParams.get('entryId')
  if (!entryId) {
    return NextResponse.json({ ok: false, error: 'entryId is required' }, { status: 400 })
  }

  await deleteScheduleEntry(user.id, entryId)
  return NextResponse.json({ ok: true })
}
