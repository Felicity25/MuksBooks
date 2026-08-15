'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

const ERROR_SESSION_KEY = 'muksbooksSession'
const ERROR_REPORT_KEY = 'errorManagerLastReport'

interface ErrorPayload {
  errorMessage?: string
  stack?: string
  page: string
  userAgent: string
  sessionId: string
  browserUrl: string
  userFeedback?: string
  localStorageSnapshot: Record<string, unknown>
  severity?: string
  browserMemoryMb?: number
  performanceMetrics?: string
  apiTraces?: string
  userId?: string
}

function makeSessionId() {
  return `session-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function getBrowserMemory(): number | undefined {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return Math.round((performance as any).memory.usedJSHeapSize / 1048576)
  }
  return undefined
}

function getPerformanceMetrics(): string {
  if (typeof performance === 'undefined') return ''
  const nav = performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming
  if (!nav) return ''

  return JSON.stringify({
    domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
    loadComplete: nav.loadEventEnd - nav.loadEventStart,
    firstPaint: (performance.getEntriesByType?.('paint')?.[0] as PerformancePaintTiming)?.startTime
  })
}

function captureApiTraces(): string {
  const traces: { url: string; status: string; time: string }[] = []
  if (typeof window !== 'undefined' && (window as any).__apiTraces) {
    return JSON.stringify((window as any).__apiTraces.slice(-5))
  }
  return ''
}

function captureLocalStorageSnapshot() {
  const keys = [
    'aiTutorSession',
    'units',
    'uploads',
    'tasks',
    'studySessions',
    'settings',
    'masteryData',
    'knowledgeChunks',
    'errorLog',
    'assignmentReviews'
  ]

  return keys.reduce<Record<string, unknown>>((snapshot, key) => {
    try {
      const value = localStorage.getItem(key)
      snapshot[key] = value ? JSON.parse(value) : null
    } catch (error) {
      snapshot[key] = `Could not parse ${key}`
    }
    return snapshot
  }, {})
}

async function postErrorReport(payload: ErrorPayload) {
  try {
    const response = await fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return response.json()
  } catch (error) {
    console.error('[ErrorManager] Failed to send error report', error)
    return { ok: false, error: String(error) }
  }
}

export function ErrorManager() {
  const [sessionId, setSessionId] = useState('')
  const [feedback, setFeedback] = useState('')
  const [reportStatus, setReportStatus] = useState<string | null>(null)
  const [isReporting, setIsReporting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedSessionId = localStorage.getItem('muksbooksSessionId')
    const currentId = storedSessionId || makeSessionId()
    setSessionId(currentId)
    localStorage.setItem('muksbooksSessionId', currentId)

    const saveSessionSnapshot = () => {
      const payload = {
        lastPage: window.location.pathname,
        updatedAt: new Date().toISOString(),
        snapshot: captureLocalStorageSnapshot()
      }
      localStorage.setItem(ERROR_SESSION_KEY, JSON.stringify(payload))
    }

    saveSessionSnapshot()
    const interval = window.setInterval(saveSessionSnapshot, 5000)

    const handleWindowError = (event: ErrorEvent) => {
      const payload: ErrorPayload = {
        errorMessage: event.message,
        stack: event.error?.stack,
        page: window.location.pathname,
        browserUrl: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: currentId,
        localStorageSnapshot: captureLocalStorageSnapshot(),
        severity: 'high',
        browserMemoryMb: getBrowserMemory(),
        performanceMetrics: getPerformanceMetrics(),
        apiTraces: captureApiTraces()
      }
      postErrorReport(payload)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : JSON.stringify(event.reason)
      const stack = event.reason instanceof Error ? event.reason.stack : undefined
      const payload: ErrorPayload = {
        errorMessage: `Unhandled rejection: ${reason}`,
        stack,
        page: window.location.pathname,
        browserUrl: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: currentId,
        localStorageSnapshot: captureLocalStorageSnapshot(),
        severity: 'high',
        browserMemoryMb: getBrowserMemory(),
        performanceMetrics: getPerformanceMetrics(),
        apiTraces: captureApiTraces()
      }
      postErrorReport(payload)
    }

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const handleReport = async () => {
    if (typeof window === 'undefined') return

    setIsReporting(true)
    setReportStatus(null)

    const payload: ErrorPayload = {
      page: window.location.pathname,
      browserUrl: window.location.href,
      userAgent: navigator.userAgent,
      sessionId,
      userFeedback: feedback || 'User requested issue report',
      localStorageSnapshot: captureLocalStorageSnapshot(),
      browserMemoryMb: getBrowserMemory(),
      performanceMetrics: getPerformanceMetrics(),
      apiTraces: captureApiTraces(),
      userId: localStorage.getItem('userId') || undefined
    }

    const result = await postErrorReport(payload)
    if (result?.ok) {
      setReportStatus(`Report sent: ${result.reportId || 'saved'} (${result.severity || 'unknown'})`)
      localStorage.setItem(ERROR_REPORT_KEY, JSON.stringify({ timestamp: new Date().toISOString(), reportId: result.reportId }))
      setFeedback('')
      setIsOpen(false)
    } else {
      setReportStatus(`Failed to send report: ${result?.error || 'unknown error'}`)
    }
    setIsReporting(false)
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {reportStatus && (
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-3 text-sm text-slate-700 shadow-lg">
            {reportStatus}
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
          Report Issue
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-950">Report an issue</h2>
            <p className="mt-2 text-sm text-slate-600">We will capture the current page state, your notes, and session data.</p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe the issue or what went wrong"
              className="mt-4 h-32 w-full rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleReport} disabled={isReporting}>
                {isReporting ? 'Sending...' : 'Send report'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
