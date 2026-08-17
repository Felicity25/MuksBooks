'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

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
  const clientRef = useRef(createSupabaseBrowserClient())

  useEffect(() => {
    const client = clientRef.current
    if (!client) { setIsLoading(false); return }

    client.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const requireAuth = useCallback((reason = 'Sign in to save your work and access it from any device.', returnPath = typeof window !== 'undefined' ? window.location.pathname : '/') => {
    if (user) return false
    setPromptState({ open: true, reason, returnPath, mode: 'sign-in' })
    return true
  }, [user])

  const signOut = useCallback(async () => {
    const client = clientRef.current
    if (client) await client.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ user, isGuest: !user, isLoading, requireAuth, promptState, setPromptState, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
