import { NextResponse } from 'next/server'
import { getDashboard } from '@/lib/app-state/service'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const data = getDashboard('default')
    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('Dashboard failed to load:', error)
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Dashboard data could not be loaded.',
      data: null
    }, { status: 500 })
  }
}
