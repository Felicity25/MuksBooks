import { NextRequest, NextResponse } from 'next/server'
import { getDashboard } from '@/lib/app-state/service'
import { searchKnowledgeBase } from '@/lib/knowledge-base/search'
import { buildDeepResearchBrief, selectResearchTopic } from '@/lib/resources/research'
import type { ResearchUploadEvidence } from '@/lib/resources/research-types'
import { getCurrentSemesterWeek } from '@/lib/semester-calendar'
import { getSemesterCalendarSnapshot } from '@/lib/semester-calendar-server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { listAllScheduleEntries } from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ScheduleContext {
  week: number | null
  unitCode: string | null
  topic: string
  additionalTopics: string[]
  updatedAt?: string | null
}

function normalizeScheduleEntry(entry: any): ScheduleContext {
  return {
    week: Number.isFinite(Number(entry.week_number)) ? Number(entry.week_number) : null,
    unitCode: entry.units?.code || entry.course_code || null,
    topic: String(entry.topic || entry.name || '').trim(),
    additionalTopics: Array.isArray(entry.additional_topics) ? entry.additional_topics.map(String) : [],
    updatedAt: entry.updated_at || null
  }
}

async function getScheduleContext(userId: string | null, unitCode?: string) {
  const snapshot = await getSemesterCalendarSnapshot(new Date(), { allowRefresh: true })
  const current = getCurrentSemesterWeek(new Date(), snapshot.calendar)
  const currentWeek = current?.weekNumber || null

  if (userId) {
    const entries = await listAllScheduleEntries(userId)
    if (entries) {
      return entries
        .map(normalizeScheduleEntry)
        .filter((entry) => entry.topic && (!unitCode || entry.unitCode?.toUpperCase() === unitCode.toUpperCase()))
        .filter((entry) => currentWeek === null || entry.week === currentWeek || entry.week === currentWeek + 1)
    }
  }

  const dashboard = getDashboard(userId || 'default')
  return (dashboard.currentTopics || [])
    .map(normalizeScheduleEntry)
    .filter((entry) => entry.topic && (!unitCode || entry.unitCode?.toUpperCase() === unitCode.toUpperCase()))
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const preferredTopic = request.nextUrl.searchParams.get('topic')?.trim().slice(0, 160) || undefined
    const requestedUnit = request.nextUrl.searchParams.get('unit')?.trim().toUpperCase().slice(0, 12) || undefined
    const force = request.nextUrl.searchParams.get('force') === 'true'
    const schedule = await getScheduleContext(user?.id || null, requestedUnit)
    const scheduleTopics = schedule.flatMap((entry) => [entry.topic, ...entry.additionalTopics]).filter(Boolean)
    const topic = selectResearchTopic(scheduleTopics, preferredTopic)

    if (!topic) {
      return NextResponse.json({
        ok: true,
        research: null,
        reason: 'Add a current or upcoming weekly topic in Units to start automatic Deep Research.',
        context: { schedule: [], currentAndUpcomingTopics: [] }
      })
    }

    const unitCodes = Array.from(new Set([
      ...(requestedUnit ? [requestedUnit] : []),
      ...schedule.map((entry) => entry.unitCode).filter((code): code is string => Boolean(code))
    ]))
    const retrievalUnit = requestedUnit || (unitCodes.length === 1 ? unitCodes[0] : undefined)
    const chunks = await searchKnowledgeBase(topic, retrievalUnit, 6, user?.id)
    const uploadEvidence: ResearchUploadEvidence[] = chunks
      .filter((result) => result.score > 0)
      .slice(0, 5)
      .map((result) => ({
        section: result.chunk.sectionTitle || `Uploaded material, section ${result.chunk.chunkIndex + 1}`,
        text: result.chunk.text.replace(/\s+/g, ' ').trim().slice(0, 1800),
        score: result.score
      }))

    const research = await buildDeepResearchBrief({
      userId: user?.id || 'default',
      topic,
      unitCodes,
      schedule,
      uploadEvidence,
      force
    })

    return NextResponse.json({
      ok: true,
      research,
      context: {
        schedule,
        currentAndUpcomingTopics: scheduleTopics,
        retrievedUploadChunks: uploadEvidence.length
      }
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[Resources] Deep Research request failed:', error)
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Deep Research could not be completed.'
    }, { status: 500 })
  }
}