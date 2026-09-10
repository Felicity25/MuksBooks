import { NextRequest, NextResponse } from 'next/server'
import { normalizeLearnerProfile } from '@/lib/learner/store'
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    const client = createSupabaseServerClient()
    if (!client) return NextResponse.json({ ok: true, profile: null })

    const { data, error } = await client
      .from('user_settings')
      .select('learner_profile')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error && error.code !== '42703') throw new Error(error.message)
    return NextResponse.json({ ok: true, profile: data?.learner_profile || null })
  } catch (error) {
    console.error('[Learner profile GET] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    const profile = normalizeLearnerProfile(await request.json().catch(() => null))
    const client = createSupabaseServerClient()
    if (!client) return NextResponse.json({ ok: true, profile })

    const { error } = await client.from('user_settings').upsert({
      user_id: user.id,
      learner_profile: profile
    }, { onConflict: 'user_id' })
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, profile })
  } catch (error) {
    console.error('[Learner profile PUT] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
