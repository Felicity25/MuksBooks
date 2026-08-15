'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const [sent, setSent] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (sent) return

    const payload = {
      page: window.location.pathname,
      browserUrl: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: localStorage.getItem('muksbooksSessionId') || `session-${Date.now()}`,
      errorMessage: error.message,
      stack: error.stack,
      userFeedback: 'Unexpected app error boundary triggered',
      localStorageSnapshot: {
        aiTutorSession: localStorage.getItem('aiTutorSession'),
        lastSession: localStorage.getItem('muksbooksSession')
      }
    }

    fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((data) => {
        setSent(true)
        if (data.ok) {
          setStatus(`Report recorded: ${data.reportId || 'unknown'} (${data.severity})`)
        } else {
          setStatus(`Reporting failed: ${data.error}`)
        }
      })
      .catch((err) => {
        setStatus(`Reporting failed: ${String(err)}`)
      })
  }, [error, sent])

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <h1 className="text-3xl font-semibold text-slate-950">Something went wrong</h1>
        <p className="mt-3 text-sm text-slate-700">We have captured an error report and will preserve your session data where possible.</p>
        {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="secondary" onClick={() => router.push('/')}>Back to dashboard</Button>
        </div>
      </div>
    </div>
  )
}
