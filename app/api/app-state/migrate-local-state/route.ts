import { NextRequest, NextResponse } from 'next/server'
import { createPlannerTask, updateUserSettings, upsertCourse } from '@/lib/app-state/service'

export const runtime = 'nodejs'

interface LegacyUnit {
  code?: string
  name?: string
}

interface LegacySession {
  title?: string
  unit?: string
  day?: string
  window?: string
}

function dayToIso(day?: string, window?: string) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const target = day ? dayNames.indexOf(day) : -1
  const now = new Date()
  const date = new Date(now)
  const offset = target >= 0 ? (target - now.getDay() + 7) % 7 : 0
  date.setDate(now.getDate() + offset)

  const start = window?.split('-')?.[0]?.trim() || '09:00'
  const [hour, minute] = start.split(':').map((value) => Number(value))
  if (Number.isFinite(hour) && Number.isFinite(minute)) {
    date.setHours(hour, minute, 0, 0)
  } else {
    date.setHours(9, 0, 0, 0)
  }

  return date.toISOString()
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const units = Array.isArray(body?.units) ? (body.units as LegacyUnit[]) : []
  const studySessions = Array.isArray(body?.studySessions) ? (body.studySessions as LegacySession[]) : []
  const settings = body?.settings && typeof body.settings === 'object' ? body.settings : null

  const courseMap = new Map<string, string>()
  for (const unit of units) {
    const code = String(unit.code || '').trim().toUpperCase()
    if (!code) continue
    const course = upsertCourse({ courseCode: code, courseName: unit.name, source: 'local_migration' })
    courseMap.set(code, course.id)
  }

  for (const session of studySessions) {
    const title = String(session.title || '').trim()
    if (!title) continue
    const unitCode = String(session.unit || '').trim().toUpperCase()
    const plannedDate = dayToIso(session.day, session.window)

    let courseId: string | undefined
    if (unitCode) {
      if (!courseMap.has(unitCode)) {
        const course = upsertCourse({ courseCode: unitCode, source: 'local_migration' })
        courseMap.set(unitCode, course.id)
      }
      courseId = courseMap.get(unitCode)
    }

    createPlannerTask({
      userId: 'default',
      title,
      courseId,
      plannedDate,
      generatedBy: 'local_migration',
      taskType: 'study'
    })
  }

  if (settings) {
    updateUserSettings('default', settings)
  }

  return NextResponse.json({
    ok: true,
    imported: {
      units: units.length,
      studySessions: studySessions.length,
      settings: Boolean(settings)
    }
  })
}
