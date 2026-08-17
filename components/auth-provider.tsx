'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'

interface AuthPromptState {
  open: boolean
  reason: string
  returnPath: string
  mode: 'sign-in' | 'sign-up'
}

interface AuthContextValue {
  user: User | null
  isGuest: boolean
  isLoading: boolean
  requireAuth: (reason?: string, returnPath?: string) => boolean
  promptState: AuthPromptState
  setPromptState: (state: AuthPromptState) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isGuest: true,
  isLoading: true,
  requireAuth: () => true,
  promptState: { open: false, reason: '', returnPath: '/', mode: 'sign-in' },
  setPromptState: () => {},
  signOut: async () => {}
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [promptState, setPromptState] = useState<AuthPromptState>({
    open: false, reason: '', returnPath: '/', mode: 'sign-in'
  })

  useEffect(() => {
    // Initialise client inside useEffect so it always runs in the browser.
    const client = createSupabaseBrowserClient()
    if (!client) { setIsLoading(false); return }

    client.auth.getSession().then((result: { data: { session: Session | null } }) => {
      setUser(result.data.session?.user ?? null)
      setIsLoading(false)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const requireAuth = useCallback((
    reason = 'Sign in to save your work and access it from any device.',
    returnPath = typeof window !== 'undefined' ? window.location.pathname : '/'
  ) => {
    if (user) return false
    setPromptState({ open: true, reason, returnPath, mode: 'sign-in' })
    return true
  }, [user])

  const signOut = useCallback(async () => {
    const client = createSupabaseBrowserClient()
    if (client) await client.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ user, isGuest: !user, isLoading, requireAuth, promptState, setPromptState, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
