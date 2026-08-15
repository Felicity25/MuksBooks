import { NextResponse } from 'next/server'
import { getPlannerContext } from '@/lib/app-state/service'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const data = getPlannerContext('default')
    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('[PlannerContext GET] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error), data: null }, { status: 500 })
  }
}
