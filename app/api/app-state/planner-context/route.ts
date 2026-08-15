import { NextResponse } from 'next/server'
import { getPlannerContext } from '@/lib/app-state/service'

export const runtime = 'nodejs'

export async function GET() {
  const data = getPlannerContext('default')
  return NextResponse.json({ ok: true, data })
}
