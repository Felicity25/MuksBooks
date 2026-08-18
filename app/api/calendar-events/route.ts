import { NextRequest, NextResponse } from 'next/server'
import { parseICalendar } from '@/lib/calendar/ical-parser'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { listCalendarEvents, listCloudUnits, replaceImportedCalendarEvents } from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'

function semesterRange(now = new Date()) {
  const year = now.getUTCFullYear()
  return {
    start: new Date(Date.UTC(year - 1, 0, 1)),
    end: new Date(Date.UTC(year + 1, 11, 31, 23, 59, 59))
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })

  const params = new URL(request.url).searchParams
  const range = semesterRange()
  const start = params.get('start') || range.start.toISOString()
  const end = params.get('end') || range.end.toISOString()
  const events = await listCalendarEvents(user.id, start, end)
  return NextResponse.json({ ok: true, events: events ?? [], migrationRequired: events === null })
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.ics')) {
    return NextResponse.json({ ok: false, error: 'Choose an .ics iCalendar file.' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: 'The timetable file must be smaller than 5 MB.' }, { status: 400 })
  }

  const units = await listCloudUnits(user.id)
  if (units === null) return NextResponse.json({ ok: false, error: 'Units are temporarily unavailable.' }, { status: 503 })

  try {
    const range = semesterRange()
    const events = parseICalendar(await file.text(), units.map((unit: any) => ({ id: unit.id, code: unit.code, name: unit.name })), range)
    if (!events.length) return NextResponse.json({ ok: false, error: 'No class events were found in this file.' }, { status: 422 })

    const result = await replaceImportedCalendarEvents(user.id, events)
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error, migrationRequired: /calendar_events/i.test(result.error) }, { status: 500 })

    return NextResponse.json({
      ok: true,
      imported: result.events.length,
      matched: events.filter((event) => event.unitId).length,
      unmatched: events.filter((event) => !event.unitId).length,
      events: result.events
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'The iCalendar file could not be parsed.' }, { status: 422 })
  }
}