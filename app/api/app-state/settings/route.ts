import { NextRequest, NextResponse } from 'next/server'
import { getUserSettings, updateUserSettings } from '@/lib/app-state/service'

export const runtime = 'nodejs'

export async function GET() {
  const settings = getUserSettings('default')
  return NextResponse.json({ ok: true, settings })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const settings = updateUserSettings('default', body || {})
  return NextResponse.json({ ok: true, settings })
}
