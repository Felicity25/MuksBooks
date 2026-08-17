import { NextRequest, NextResponse } from 'next/server'
import { getUserSettings, updateUserSettings } from '@/lib/app-state/service'
import { requireAuthCookie } from '@/lib/api-auth'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const settings = getUserSettings('default')
    return NextResponse.json({ ok: true, settings })
  } catch (error) {
    console.error('[Settings GET] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error), settings: null }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAuthCookie(request)
  if (authError) return authError
  try {
    const body = await request.json()
    const settings = updateUserSettings('default', body || {})
    return NextResponse.json({ ok: true, settings })
  } catch (error) {
    console.error('[Settings POST] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
