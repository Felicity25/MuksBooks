import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { deleteCalendarEvent } from '@/lib/supabase/documents-service'
import { GET, POST } from '@/app/api/calendar-events/route'

export const runtime = 'nodejs'

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId')

  if (eventId) {
    await deleteCalendarEvent(user.id, eventId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false, error: 'eventId is required' }, { status: 400 })
}

export { GET, POST }
