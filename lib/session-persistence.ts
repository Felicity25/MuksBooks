import { useEffect } from 'react'

const SESSION_KEYS = [
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

export interface SessionState {
  [key: string]: any
}

export function useSessionPersistence(storageKey: string, initialState: SessionState, deps: any[] = []) {
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved && JSON.parse(saved)) {
        console.log(`[SessionPersistence] Restored ${storageKey}`)
      }
    } catch (error) {
      console.error(`[SessionPersistence] Failed to restore ${storageKey}:`, error)
    }
  }, [storageKey])

  const saveSession = (state: SessionState) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch (error) {
      console.error(`[SessionPersistence] Failed to save ${storageKey}:`, error)
    }
  }

  return saveSession
}

export function restoreSessionState(storageKey: string): SessionState | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(storageKey)
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.error(`[SessionPersistence] Failed to parse ${storageKey}:`, error)
    return null
  }
}

export function clearAllSessions() {
  if (typeof window === 'undefined') return
  SESSION_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`[SessionPersistence] Failed to clear ${key}:`, error)
    }
  })
}

export function getSessionSnapshot() {
  if (typeof window === 'undefined') return {}
  const snapshot: Record<string, any> = {}
  SESSION_KEYS.forEach((key) => {
    try {
      const value = localStorage.getItem(key)
      snapshot[key] = value ? JSON.parse(value) : null
    } catch (error) {
      snapshot[key] = `Could not parse ${key}`
    }
  })
  return snapshot
}
