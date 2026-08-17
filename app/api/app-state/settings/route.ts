import { NextRequest, NextResponse } from 'next/server'
import { getUserSettings, updateUserSettings } from '@/lib/app-state/service'
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    const userId = user?.id || 'default'
    const client = createSupabaseServerClient()

    if (user && client) {
      const [{ data: userSettings }, { data: profile }] = await Promise.all([
        client.from('user_settings').select('theme, name, degree, target_marks, feedback_strictness, pomodoro_length, study_times').eq('user_id', user.id).maybeSingle(),
        client.from('profiles').select('full_name, email, degree, timezone').eq('id', user.id).maybeSingle()
      ])

      const settings = {
        theme: (userSettings?.theme as 'light' | 'dark' | 'system' | undefined) || 'light',
        name: userSettings?.name || profile?.full_name || user.email || '',
        degree: userSettings?.degree || profile?.degree || '',
        targetMarks: userSettings?.target_marks || '',
        feedbackStrictness: (userSettings?.feedback_strictness as 'lenient' | 'normal' | 'strict' | undefined) || 'normal',
        pomodoroLength: userSettings?.pomodoro_length || 25,
        studyTimes: userSettings?.study_times || ''
      }

      return NextResponse.json({ ok: true, settings })
    }

    const settings = getUserSettings(userId)
    return NextResponse.json({ ok: true, settings })
  } catch (error) {
    console.error('[Settings GET] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error), settings: null }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const client = createSupabaseServerClient()
    const body = await request.json()
    const settings = updateUserSettings(user.id, body || {})

    if (client) {
      await Promise.all([
        client.from('profiles').upsert(
          {
            id: user.id,
            email: user.email ?? null,
            full_name: settings.name || user.email || null,
            degree: settings.degree || null,
            timezone: 'Australia/Melbourne'
          },
          { onConflict: 'id' }
        ),
        client.from('user_settings').upsert(
          {
            user_id: user.id,
            theme: settings.theme,
            name: settings.name || null,
            degree: settings.degree || null,
            target_marks: settings.targetMarks || null,
            feedback_strictness: settings.feedbackStrictness,
            pomodoro_length: settings.pomodoroLength,
            study_times: settings.studyTimes || null
          },
          { onConflict: 'user_id' }
        )
      ])
    }

    return NextResponse.json({ ok: true, settings })
  } catch (error) {
    console.error('[Settings POST] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
