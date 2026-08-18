import { getAuthenticatedUser } from '@/lib/supabase/server'

export interface RLabExecutionInput {
  code: string
  files?: Array<{ name: string; contentBase64: string; mimeType?: string }>
  timeoutMs?: number
}

export interface RLabExecutionResult {
  ok: boolean
  stdout: string
  stderr: string
  plots?: Array<{ mimeType: string; base64: string }>
  files?: Array<{ name: string; path: string; mimeType?: string }>
  durationMs?: number
  error?: string
}

/**
 * R execution is delegated to an isolated remote sandbox service.
 * The Next.js app never executes R directly and never forwards application secrets.
 */
export async function executeRInSandbox(input: RLabExecutionInput): Promise<RLabExecutionResult> {
  const endpoint = process.env.R_EXECUTOR_ENDPOINT || ''
  const token = process.env.R_EXECUTOR_TOKEN || ''

  if (!endpoint) {
    return {
      ok: false,
      stdout: '',
      stderr: '',
      error: 'R execution sandbox is not configured. Set R_EXECUTOR_ENDPOINT to enable real R execution.'
    }
  }

  const user = await getAuthenticatedUser()
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      code: input.code,
      files: input.files || [],
      timeoutMs: Math.min(Math.max(input.timeoutMs || 25000, 1000), 60000),
      limits: {
        cpuSeconds: 20,
        memoryMb: 512,
        maxFiles: 8,
        maxOutputKb: 1024
      },
      metadata: {
        userId: user?.id || null,
        source: 'muksbooks-tutor-r-lab'
      }
    })
  })

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown sandbox error')
    return {
      ok: false,
      stdout: '',
      stderr: text,
      error: `R sandbox execution failed with status ${response.status}`
    }
  }

  const payload = await response.json().catch(() => null)
  if (!payload || typeof payload !== 'object') {
    return {
      ok: false,
      stdout: '',
      stderr: '',
      error: 'R sandbox returned an invalid response payload.'
    }
  }

  return {
    ok: Boolean((payload as any).ok),
    stdout: String((payload as any).stdout || ''),
    stderr: String((payload as any).stderr || ''),
    plots: Array.isArray((payload as any).plots) ? (payload as any).plots : [],
    files: Array.isArray((payload as any).files) ? (payload as any).files : [],
    durationMs: Number((payload as any).durationMs || 0),
    error: (payload as any).error ? String((payload as any).error) : undefined
  }
}
