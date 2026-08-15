import fs from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface ErrorReport {
  id: string
  timestamp: string
  sessionId: string
  page: string
  browserUrl: string
  userAgent: string
  userFeedback?: string
  errorMessage?: string
  stack?: string
  localStorageSnapshot: Record<string, unknown>
  severity: ErrorSeverity
  resolutionEstimate: string
  browserMemoryMb?: number
  performanceMetrics?: string
  apiTraces?: string
  userId?: string
}

export interface PersistResult {
  storedInDatabase: boolean
  storedInFile: boolean
  databaseError?: string
}

const LOG_DIR = path.join(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'error-reports.jsonl')

function determineSeverity(value?: string): ErrorSeverity {
  if (!value) return 'low'
  const normalized = value.toLowerCase()

  if (normalized.includes('crash') || normalized.includes('unhandled') || normalized.includes('referenceerror') || normalized.includes('typeerror') || normalized.includes('stack')) {
    return 'critical'
  }

  if (normalized.includes('quota') || normalized.includes('invalid api') || normalized.includes('authentication') || normalized.includes('401') || normalized.includes('500') || normalized.includes('server')) {
    return 'high'
  }

  if (normalized.includes('failed') || normalized.includes('error') || normalized.includes('timeout') || normalized.includes('not found')) {
    return 'medium'
  }

  return 'low'
}

function estimateResolution(severity: ErrorSeverity) {
  switch (severity) {
    case 'critical':
      return '1+ days'
    case 'high':
      return '1-4 hours'
    case 'medium':
      return '30 mins'
    default:
      return '30 mins'
  }
}

export function classifySeverity(errorMessage?: string, userFeedback?: string): ErrorSeverity {
  const severityFromMessage = determineSeverity(errorMessage)
  const severityFromFeedback = determineSeverity(userFeedback)
  if (severityFromFeedback === 'critical' || severityFromMessage === 'critical') return 'critical'
  if (severityFromFeedback === 'high' || severityFromMessage === 'high') return 'high'
  if (severityFromFeedback === 'medium' || severityFromMessage === 'medium') return 'medium'
  return 'low'
}

export async function persistErrorReport(report: ErrorReport & { reportId: string; browserMemoryMb?: number; performanceMetrics?: string; apiTraces?: string; userId?: string }): Promise<PersistResult> {
  const severity = classifySeverity(report.errorMessage, report.userFeedback)
  const resolutionEstimate = estimateResolution(severity)
  const normalizedReport = {
    ...report,
    severity,
    resolutionEstimate
  }

  let storedInFile = false
  let storedInDatabase = false
  let databaseError: string | undefined

  // Always keep a JSONL backup, even when DB is offline.
  try {
    const line = JSON.stringify(normalizedReport) + '\n'
    await fs.mkdir(LOG_DIR, { recursive: true })
    await fs.appendFile(LOG_FILE, line, 'utf8')
    storedInFile = true
  } catch (error) {
    console.error('[ErrorManager] Failed to append backup report', error)
  }

  try {
    await prisma.errorReport.create({
      data: {
        reportId: report.reportId,
        sessionId: report.sessionId,
        page: report.page,
        browserUrl: report.browserUrl,
        userAgent: report.userAgent,
        userFeedback: report.userFeedback,
        errorMessage: report.errorMessage,
        stack: report.stack,
        severity,
        resolutionEstimate,
        browserMemoryMb: report.browserMemoryMb,
        performanceMetrics: report.performanceMetrics,
        apiTraces: report.apiTraces,
        userId: report.userId,
        localStorageSnapshot: JSON.stringify(report.localStorageSnapshot)
      }
    })
    storedInDatabase = true
  } catch (error: any) {
    databaseError = error?.message || String(error)
    console.error('[ErrorManager] Failed to persist report to database', error)
  }

  if (!storedInFile && !storedInDatabase) {
    throw new Error('Failed to persist error report to both database and backup file')
  }

  return {
    storedInDatabase,
    storedInFile,
    databaseError
  }
}

export function buildReportId() {
  return `err-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

export function getResolutionEstimate(severity: ErrorSeverity) {
  return estimateResolution(severity)
}
