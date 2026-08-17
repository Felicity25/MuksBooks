import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    build: 'guest-browsing-v2',
    guestMode: true,
    middlewarePassthrough: true,
    timestamp: new Date().toISOString(),
    random: Math.random()
  })
}
