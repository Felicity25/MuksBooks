import { NextRequest, NextResponse } from 'next/server'
import { loadStudentProfile, saveStudentProfile } from '@/lib/student-profile/store'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('studentId') || 'default'
  const profile = await loadStudentProfile(studentId)
  return NextResponse.json({ ok: true, profile })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const studentId = body.studentId || 'default'
  const profile = await loadStudentProfile(studentId)
  const merged = { ...profile, ...body, studentId }
  await saveStudentProfile(merged)
  return NextResponse.json({ ok: true, profile: merged })
}
