import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    build: 'guest-browsing-v1',
    guestMode: true,
    middlewarePassthrough: true,
    timestamp: new Date().toISOString()
  })
}
