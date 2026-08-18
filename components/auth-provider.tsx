'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import {
  DEFAULT_USER_SETTINGS,
  GUEST_SETTINGS_KEY,
  normalizeUserSettings,
  type UserSettings
} from '@/lib/user-settings'

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
  settings: UserSettings
  saveSettings: (updates: Partial<UserSettings>) => Promise<UserSettings>
  requireAuth: (reason?: string, returnPath?: string) => boolean
  promptState: AuthPromptState
  setPromptState: (state: AuthPromptState) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isGuest: true,
  isLoading: true,
  settings: DEFAULT_USER_SETTINGS,
  saveSettings: async () => DEFAULT_USER_SETTINGS,
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
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS)
  const [promptState, setPromptState] = useState<AuthPromptState>({
    open: false, reason: '', returnPath: '/', mode: 'sign-in'
  })

  const loadSettings = useCallback(async (isAuthenticated: boolean) => {
    if (!isAuthenticated) {
      try {
        const stored = window.localStorage.getItem(GUEST_SETTINGS_KEY)
        setSettings(normalizeUserSettings(stored ? JSON.parse(stored) : null))
      } catch {
        setSettings(DEFAULT_USER_SETTINGS)
      }
      return
    }

    try {
      const response = await fetch('/api/app-state/settings', { cache: 'no-store' })
      if (!response.ok) return
      const payload = await response.json().catch(() => null)
      if (payload?.ok && payload.settings) {
        setSettings(normalizeUserSettings(payload.settings))
      }
    } catch {
      // Keep default settings when settings endpoint is unavailable.
    }
  }, [])

  useEffect(() => {
    // Initialise client inside useEffect so it always runs in the browser.
    const client = createSupabaseBrowserClient()
    if (!client) {
      void loadSettings(false)
      setIsLoading(false)
      return
    }

    client.auth.getSession().then((result: { data: { session: Session | null } }) => {
      setUser(result.data.session?.user ?? null)
      void loadSettings(Boolean(result.data.session?.user))
      setIsLoading(false)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
      void loadSettings(Boolean(session?.user))
    })

    return () => subscription.unsubscribe()
  }, [loadSettings])

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolvedTheme = settings.theme === 'system' ? (media.matches ? 'dark' : 'light') : settings.theme
      root.dataset.theme = resolvedTheme
      root.dataset.textSize = settings.textSize
      root.dataset.density = settings.density
      root.dataset.motion = settings.motion
      root.dataset.font = settings.font
      root.style.colorScheme = resolvedTheme
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings.theme, settings.textSize, settings.density, settings.motion, settings.font])

  const saveSettings = useCallback(async (updates: Partial<UserSettings>) => {
    const next = normalizeUserSettings({ ...settings, ...updates })
    if (!user) {
      window.localStorage.setItem(GUEST_SETTINGS_KEY, JSON.stringify(next))
      setSettings(next)
      return next
    }

    const response = await fetch('/api/app-state/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next)
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.settings) {
      throw new Error(payload?.error || 'Settings could not be saved.')
    }
    const saved = normalizeUserSettings(payload.settings)
    setSettings(saved)
    return saved
  }, [settings, user])

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
    <AuthContext.Provider value={{ user, isGuest: !user, isLoading, settings, saveSettings, requireAuth, promptState, setPromptState, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
