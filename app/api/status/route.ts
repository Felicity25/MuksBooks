import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'MuksBooks cloud migration deployment - ' + new Date().toISOString(),
    timestamp: Date.now()
  })
}
