import { NextRequest, NextResponse } from 'next/server'
import { buildReportId, classifySeverity, persistErrorReport, getResolutionEstimate } from '@/lib/error-manager'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    let body: any = {}

    if (rawBody) {
      try {
        body = JSON.parse(rawBody)
      } catch {
        return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 })
      }
    }

    const now = new Date().toISOString()

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
    }

    const reportId = buildReportId()
    const severity = classifySeverity(body.errorMessage, body.userFeedback)
    const resolutionEstimate = getResolutionEstimate(severity)

    const report = {
      reportId,
      id: reportId,
      timestamp: now,
      sessionId: String(body.sessionId || 'unknown'),
      page: String(body.page || 'unknown'),
      browserUrl: String(body.browserUrl || ''),
      userAgent: String(body.userAgent || ''),
      userFeedback: body.userFeedback ? String(body.userFeedback) : undefined,
      errorMessage: body.errorMessage ? String(body.errorMessage) : undefined,
      stack: body.stack ? String(body.stack) : undefined,
      localStorageSnapshot: body.localStorageSnapshot || {},
      severity,
      resolutionEstimate,
      browserMemoryMb: body.browserMemoryMb ? parseInt(String(body.browserMemoryMb), 10) : undefined,
      performanceMetrics: body.performanceMetrics ? String(body.performanceMetrics) : undefined,
      apiTraces: body.apiTraces ? String(body.apiTraces) : undefined,
      userId: body.userId ? String(body.userId) : undefined
    }

    const persistence = await persistErrorReport(report)
    console.log('[ErrorReport] Saved report', reportId, severity, report.page, persistence)

    return NextResponse.json(
      {
        ok: true,
        reportId,
        severity,
        resolutionEstimate,
        storedInDatabase: persistence.storedInDatabase,
        storedInFile: persistence.storedInFile,
        warning: persistence.storedInDatabase ? undefined : 'Database unavailable; report saved to local backup file.'
      },
      { status: persistence.storedInDatabase ? 200 : 202 }
    )
  } catch (error: any) {
    console.error('[ErrorReport] Failed to save report:', error?.message || error)
    return NextResponse.json({ ok: false, error: 'Server failed to save error report' }, { status: 500 })
  }
}
