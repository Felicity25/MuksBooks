'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { emitAppStateUpdate } from '@/lib/app-state/client-events'

type StudyPhase = 'focus' | 'short_break' | 'long_break'
type StudyStatus = 'idle' | 'running' | 'paused'

interface PlannerTaskOption {
  id: string
  title: string
  courseCode: string | null
  estimatedMinutes: number
}

interface StudyPrefs {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  cycles: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  muted: boolean
  volume: number
  notificationsEnabled: boolean
}

interface StudyState {
  status: StudyStatus
  phase: StudyPhase
  endsAt: string | null
  remainingMs: number
  startedAt: string | null
  completedFocusCount: number
  activeTaskId: string | null
  activeTaskTitle: string
  activeTaskUnitCode: string | null
}

interface StudySummary {
  focusedMinutes: number
  sessionCount: number
}

interface GlobalStudyContextValue {
  tasks: PlannerTaskOption[]
  prefs: StudyPrefs
  state: StudyState
  summary: StudySummary
  recentSessions: Array<{ id: string; title: string; duration_minutes: number; started_at: string }>
  setActiveTask: (taskId: string | null, title?: string) => void
  updatePrefs: (updates: Partial<StudyPrefs>) => void
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  skip: () => void
  addMinutes: (minutes: number) => void
  setCustomTaskTitle: (title: string) => void
  refresh: () => Promise<void>
  currentRemainingMs: number
}

const STORAGE_KEY = 'muksbooks:global-study:v1'

const DEFAULT_PREFS: StudyPrefs = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 20,
  cycles: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  muted: false,
  volume: 0.6,
  notificationsEnabled: false
}

const DEFAULT_STATE: StudyState = {
  status: 'idle',
  phase: 'focus',
  endsAt: null,
  remainingMs: DEFAULT_PREFS.focusMinutes * 60_000,
  startedAt: null,
  completedFocusCount: 0,
  activeTaskId: null,
  activeTaskTitle: '',
  activeTaskUnitCode: null
}

const GlobalStudyContext = createContext<GlobalStudyContextValue | null>(null)

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function durationMsForPhase(phase: StudyPhase, prefs: StudyPrefs) {
  if (phase === 'focus') return prefs.focusMinutes * 60_000
  if (phase === 'short_break') return prefs.shortBreakMinutes * 60_000
  return prefs.longBreakMinutes * 60_000
}

function phaseLabel(phase: StudyPhase) {
  if (phase === 'focus') return 'Focus complete'
  if (phase === 'short_break') return 'Short break complete'
  return 'Long break complete'
}

export function GlobalStudyProvider({ children }: { children: React.ReactNode }) {
  const { user, settings, saveSettings } = useAuth()
  const [tasks, setTasks] = useState<PlannerTaskOption[]>([])
  const [prefs, setPrefs] = useState<StudyPrefs>(DEFAULT_PREFS)
  const [state, setState] = useState<StudyState>(DEFAULT_STATE)
  const [summary, setSummary] = useState<StudySummary>({ focusedMinutes: 0, sessionCount: 0 })
  const [recentSessions, setRecentSessions] = useState<Array<{ id: string; title: string; duration_minutes: number; started_at: string }>>([])
  const [now, setNow] = useState(Date.now())
  const audioContextRef = useRef<AudioContext | null>(null)

  const currentRemainingMs = state.status === 'running' && state.endsAt
    ? Math.max(0, new Date(state.endsAt).getTime() - now)
    : Math.max(0, state.remainingMs)

  const refresh = useCallback(async () => {
    if (!user) {
      setTasks([])
      setSummary({ focusedMinutes: 0, sessionCount: 0 })
      setRecentSessions([])
      return
    }

    const [taskRes, sessionRes] = await Promise.all([
      fetch('/api/app-state/planner-tasks', { cache: 'no-store' }),
      fetch('/api/app-state/study-sessions', { cache: 'no-store' })
    ])

    const taskPayload = await taskRes.json().catch(() => null)
    const sessionPayload = await sessionRes.json().catch(() => null)

    if (taskPayload?.ok) {
      setTasks((taskPayload.tasks || []).map((task: any) => ({
        id: task.id,
        title: task.title,
        courseCode: task.course_code || null,
        estimatedMinutes: Number(task.estimated_minutes) || 45
      })))
    }

    if (sessionPayload?.ok) {
      setSummary(sessionPayload.summary || { focusedMinutes: 0, sessionCount: 0 })
      setRecentSessions((sessionPayload.recent || []).slice(0, 5))
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    setPrefs({
      focusMinutes: clamp(settings.focusDurationMinutes ?? settings.pomodoroLength ?? 25, 5, 180),
      shortBreakMinutes: clamp(settings.shortBreakMinutes ?? 5, 1, 60),
      longBreakMinutes: clamp(settings.longBreakMinutes ?? 20, 1, 90),
      cycles: clamp(settings.focusCycleCount ?? 4, 1, 12),
      autoStartBreaks: Boolean(settings.autoStartBreaks),
      autoStartFocus: Boolean(settings.autoStartFocus),
      muted: Boolean(settings.studyBellMuted),
      volume: clamp(settings.studyBellVolume ?? 0.6, 0, 1),
      notificationsEnabled: Boolean(settings.focusNotificationsEnabled)
    })
  }, [settings])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { state?: StudyState }
      if (parsed?.state) {
        setState((prev) => ({ ...prev, ...parsed.state }))
      }
    } catch {
      // ignore corrupted local state
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state }))
  }, [state])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const playBell = useCallback(() => {
    if (prefs.muted || prefs.volume <= 0) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const context = audioContextRef.current || new AudioCtx()
      audioContextRef.current = context
      const nowTime = context.currentTime
      const pattern = [740, 880]
      pattern.forEach((frequency, index) => {
        const osc = context.createOscillator()
        const gain = context.createGain()
        osc.type = 'sine'
        osc.frequency.value = frequency
        gain.gain.value = prefs.volume * 0.15
        osc.connect(gain)
        gain.connect(context.destination)
        const start = nowTime + index * 0.25
        const end = start + 0.18
        osc.start(start)
        osc.stop(end)
      })
    } catch {
      // non-fatal
    }
  }, [prefs.muted, prefs.volume])

  const sendNotification = useCallback((title: string, body: string) => {
    if (!prefs.notificationsEnabled || !('Notification' in window)) return
    if (Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  }, [prefs.notificationsEnabled])

  const recordFocusSession = useCallback(async (finishedState: StudyState, endedAt: string) => {
    if (!user || finishedState.phase !== 'focus') return
    const startedAt = finishedState.startedAt
    if (!startedAt) return
    const minutes = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)
    if (!Number.isFinite(minutes) || minutes <= 0) return

    await fetch('/api/app-state/study-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: finishedState.activeTaskId,
        title: finishedState.activeTaskTitle || 'Focus session',
        startedAt,
        endedAt,
        durationMinutes: minutes
      })
    })

    emitAppStateUpdate('planner')
    void refresh()
  }, [refresh, user])

  const transitionPhase = useCallback((previous: StudyState): StudyState => {
    const justFinishedFocus = previous.phase === 'focus'
    const completedFocusCount = justFinishedFocus ? previous.completedFocusCount + 1 : previous.completedFocusCount
    const shouldLongBreak = justFinishedFocus && completedFocusCount % prefs.cycles === 0

    const nextPhase: StudyPhase = justFinishedFocus
      ? (shouldLongBreak ? 'long_break' : 'short_break')
      : 'focus'

    const shouldAutoStart = nextPhase === 'focus' ? prefs.autoStartFocus : prefs.autoStartBreaks
    const remaining = durationMsForPhase(nextPhase, prefs)
    const nextEndsAt = shouldAutoStart ? new Date(Date.now() + remaining).toISOString() : null

    playBell()
    sendNotification(phaseLabel(previous.phase), `${previous.activeTaskTitle || 'Session'} moved to ${nextPhase.replace('_', ' ')}.`)

    const nextStatus: StudyStatus = shouldAutoStart ? 'running' : 'paused'

    return {
      ...previous,
      phase: nextPhase,
      status: nextStatus,
      endsAt: nextEndsAt,
      remainingMs: remaining,
      startedAt: shouldAutoStart ? new Date().toISOString() : null,
      completedFocusCount
    }
  }, [playBell, prefs, sendNotification])

  useEffect(() => {
    if (state.status !== 'running' || !state.endsAt) return
    const remaining = new Date(state.endsAt).getTime() - now
    if (remaining > 0) return

    const endedAt = new Date().toISOString()
    const snapshot = state
    setState((prev) => transitionPhase(prev))
    void recordFocusSession(snapshot, endedAt)
  }, [now, recordFocusSession, state, transitionPhase])

  const updatePrefs = useCallback((updates: Partial<StudyPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...updates }
      void saveSettings({
        focusDurationMinutes: next.focusMinutes,
        shortBreakMinutes: next.shortBreakMinutes,
        longBreakMinutes: next.longBreakMinutes,
        focusCycleCount: next.cycles,
        autoStartBreaks: next.autoStartBreaks,
        autoStartFocus: next.autoStartFocus,
        studyBellMuted: next.muted,
        studyBellVolume: next.volume,
        focusNotificationsEnabled: next.notificationsEnabled
      } as any)
      return next
    })
  }, [saveSettings])

  const setActiveTask = useCallback((taskId: string | null, customTitle?: string) => {
    setState((prev) => {
      if (!taskId) return { ...prev, activeTaskId: null, activeTaskTitle: customTitle || '', activeTaskUnitCode: null }
      const task = tasks.find((item) => item.id === taskId)
      return {
        ...prev,
        activeTaskId: taskId,
        activeTaskTitle: customTitle || task?.title || prev.activeTaskTitle,
        activeTaskUnitCode: task?.courseCode || null
      }
    })
  }, [tasks])

  const setCustomTaskTitle = useCallback((title: string) => {
    setState((prev) => ({ ...prev, activeTaskTitle: title }))
  }, [])

  const start = useCallback(() => {
    setState((prev) => {
      const remaining = prev.status === 'paused' ? prev.remainingMs : durationMsForPhase(prev.phase, prefs)
      return {
        ...prev,
        status: 'running',
        remainingMs: remaining,
        endsAt: new Date(Date.now() + remaining).toISOString(),
        startedAt: new Date().toISOString()
      }
    })
  }, [prefs])

  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'running' || !prev.endsAt) return prev
      const remaining = Math.max(0, new Date(prev.endsAt).getTime() - Date.now())
      return { ...prev, status: 'paused', endsAt: null, remainingMs: remaining }
    })
  }, [])

  const resume = useCallback(() => {
    setState((prev) => {
      const remaining = Math.max(0, prev.remainingMs)
      return {
        ...prev,
        status: 'running',
        endsAt: new Date(Date.now() + remaining).toISOString(),
        startedAt: prev.startedAt || new Date().toISOString()
      }
    })
  }, [])

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'idle',
      phase: 'focus',
      endsAt: null,
      remainingMs: durationMsForPhase('focus', prefs),
      startedAt: null,
      completedFocusCount: 0
    }))
  }, [prefs])

  const skip = useCallback(() => {
    const snapshot = state
    setState((prev) => transitionPhase(prev))
    if (snapshot.phase === 'focus' && snapshot.startedAt) {
      const endedAt = new Date().toISOString()
      void recordFocusSession(snapshot, endedAt)
    }
  }, [recordFocusSession, state, transitionPhase])

  const addMinutes = useCallback((minutes: number) => {
    const extra = Math.max(1, Math.round(minutes)) * 60_000
    setState((prev) => {
      if (prev.status === 'running' && prev.endsAt) {
        const end = new Date(prev.endsAt).getTime() + extra
        return { ...prev, endsAt: new Date(end).toISOString(), remainingMs: Math.max(0, end - Date.now()) }
      }
      return { ...prev, remainingMs: prev.remainingMs + extra }
    })
  }, [])

  const value = useMemo<GlobalStudyContextValue>(() => ({
    tasks,
    prefs,
    state,
    summary,
    recentSessions,
    setActiveTask,
    updatePrefs,
    start,
    pause,
    resume,
    reset,
    skip,
    addMinutes,
    setCustomTaskTitle,
    refresh,
    currentRemainingMs
  }), [addMinutes, currentRemainingMs, pause, prefs, recentSessions, refresh, reset, resume, setActiveTask, setCustomTaskTitle, skip, start, state, summary, tasks, updatePrefs])

  return <GlobalStudyContext.Provider value={value}>{children}</GlobalStudyContext.Provider>
}

export function useGlobalStudy() {
  const context = useContext(GlobalStudyContext)
  if (!context) throw new Error('useGlobalStudy must be used within GlobalStudyProvider')
  return context
}
