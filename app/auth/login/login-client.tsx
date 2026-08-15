'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function LoginClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get('error')
    if (error) setMessage(error)

    const client = createSupabaseBrowserClient()
    if (!client) return

    client.auth.getSession().then(({ data }: { data: { session: unknown | null } }) => {
      if (data?.session) {
        const next = searchParams.get('next') || '/'
        window.location.href = next
      }
    })
  }, [searchParams])

  const persistProfile = async (
    client: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
    user: { id: string; email?: string | null; user_metadata?: { full_name?: string | null } }
  ) => {
    const profileRow = {
      id: user.id,
      email: user.email ?? null,
      full_name: user.user_metadata?.full_name ?? user.email ?? null
    }

    const { error } = await (client.from('profiles') as any).upsert(profileRow, {
      onConflict: 'id'
    })

    if (error) {
      console.warn('Profile sync failed:', error.message)
    }
  }

  const runAuthAction = async (event: React.FormEvent) => {
    event.preventDefault()
    const client = createSupabaseBrowserClient()
    if (!client) {
      setMessage('Supabase configuration is missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
      return
    }

    setIsLoading(true)
    setMessage(null)

    const redirectTo = `${window.location.origin}/auth/callback`
    const action = mode === 'sign-in'
      ? client.auth.signInWithPassword({ email, password })
      : client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })

    const { data, error } = await action
    setIsLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    if (data.user) {
      await persistProfile(client, data.user)
    }

    if (mode === 'sign-up' && data.user && !data.session) {
      setMessage('Check your email to confirm the sign-up, then sign in to continue.')
      return
    }

    window.location.href = '/'
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">MukBooks</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">{mode === 'sign-in' ? 'Sign in' : 'Create account'}</h1>
        <p className="mt-2 text-sm text-slate-600">Access your streamlined academic workload and cloud-persisted study data.</p>

        <div className="mt-5 inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('sign-in')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${mode === 'sign-in' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('sign-up')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${mode === 'sign-up' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'}`}
          >
            Sign up
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={runAuthAction}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
              placeholder="student@example.com"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </label>

          {message && <p className="text-sm text-rose-600">{message}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (mode === 'sign-in' ? 'Signing in...' : 'Creating account...') : (mode === 'sign-in' ? 'Sign in' : 'Create account')}
          </button>
        </form>
      </div>
    </main>
  )
}