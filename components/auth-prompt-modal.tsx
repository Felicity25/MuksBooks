'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function AuthPromptModal() {
  const { promptState, setPromptState } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  if (!promptState.open) return null

  const { reason, returnPath, mode } = promptState

  const close = () => {
    setPromptState({ ...promptState, open: false })
    setMessage(null)
    setEmail('')
    setPassword('')
  }

  const switchMode = (next: 'sign-in' | 'sign-up') => {
    setPromptState({ ...promptState, mode: next })
    setMessage(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const client = createSupabaseBrowserClient()
    if (!client) { setMessage('Supabase is not configured.'); return }

    setIsLoading(true)
    setMessage(null)

    const redirectTo = `${window.location.origin}/auth/callback`
    const { data, error } = mode === 'sign-in'
      ? await client.auth.signInWithPassword({ email, password })
      : await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })

    setIsLoading(false)

    if (error) { setMessage(error.message); return }

    if (mode === 'sign-up' && data.user && !data.session) {
      setMessage('Check your email to confirm your account, then sign in.')
      return
    }

    // Upsert profile
    if (data.user) {
      try {
        await (client.from('profiles') as any).upsert(
          { id: data.user.id, email: data.user.email ?? null, full_name: data.user.email ?? null },
          { onConflict: 'id' }
        )
      } catch { /* non-fatal */ }
    }

    close()
    window.location.href = returnPath
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onClick={close}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">MuksBooks</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">Sign in to continue</h2>
        <p className="mt-1 text-sm text-slate-500">{reason}</p>

        <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
          {(['sign-in', 'sign-up'] as const).map(m => (
            <button key={m} type="button" onClick={() => switchMode(m)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${mode === m ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>
              {m === 'sign-in' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="Email" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
            placeholder="Password" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500" />

          {message && <p className="text-sm text-rose-600">{message}</p>}

          <button type="submit" disabled={isLoading}
            className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60">
            {isLoading ? '…' : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button type="button" onClick={close} className="mt-3 w-full rounded-xl px-4 py-2 text-sm text-slate-500 transition hover:bg-slate-100">
          Cancel — Continue Browsing
        </button>
      </div>
    </div>
  )
}
