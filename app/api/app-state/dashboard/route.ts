import { NextResponse } from 'next/server'
import { getDashboard } from '@/lib/app-state/service'

export const runtime = 'nodejs'

export async function GET() {
  const data = getDashboard('default')
  return NextResponse.json({ ok: true, data })
}
