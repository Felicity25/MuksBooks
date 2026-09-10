'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import {
  DEFAULT_LEARNER_PROFILE,
  getLearnerProfile,
  normalizeLearnerProfile,
  saveLearnerProfile,
  type LearnerProfile
} from '@/lib/learner/store'
import {
  getCurriculum,
  isSupportedCurriculumId,
  resolveViewingCurriculum,
  type CurriculumDefinition,
  type SupportedCurriculumId
} from '@/lib/learner/curriculum-registry'

export type ViewingCurriculum = 'MY' | SupportedCurriculumId

interface CurriculumContextValue {
  profile: LearnerProfile
  viewingCurriculum: ViewingCurriculum
  curriculum: CurriculumDefinition
  selectedLevelId: string
  setViewingCurriculum: (value: ViewingCurriculum) => void
  setSelectedLevelId: (value: string) => void
  saveProfile: (updates: Partial<LearnerProfile>) => Promise<LearnerProfile>
  isProfileLoading: boolean
}

const CurriculumContext = createContext<CurriculumContextValue | null>(null)
const VIEWING_KEY = 'muksbooks:viewing-curriculum:v1'
const LEVEL_KEY = 'muksbooks:viewing-curriculum-level:v1'

export function CurriculumProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id || null
  const [profile, setProfile] = useState<LearnerProfile>(DEFAULT_LEARNER_PROFILE)
  const [viewingCurriculum, setViewingCurriculumState] = useState<ViewingCurriculum>('MY')
  const [selectedLevelId, setSelectedLevelIdState] = useState('')
  const [isProfileLoading, setIsProfileLoading] = useState(true)

  useEffect(() => {
    const storedViewing = window.sessionStorage.getItem(VIEWING_KEY)
    if (storedViewing === 'MY' || isSupportedCurriculumId(storedViewing)) setViewingCurriculumState(storedViewing)
    setSelectedLevelIdState(window.sessionStorage.getItem(LEVEL_KEY) || '')

    if (!userId) {
      setProfile(getLearnerProfile())
      setIsProfileLoading(false)
      return
    }

    const controller = new AbortController()
    const localProfile = getLearnerProfile()
    setIsProfileLoading(true)
    fetch('/api/app-state/learner-profile', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then(async (payload) => {
        let accountProfile = payload?.profile ? normalizeLearnerProfile(payload.profile) : null
        if (!accountProfile && localProfile.onboardingCompleted) {
          const importResponse = await fetch('/api/app-state/learner-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localProfile),
            signal: controller.signal
          })
          const imported = await importResponse.json().catch(() => null)
          if (importResponse.ok && imported?.profile) accountProfile = normalizeLearnerProfile(imported.profile)
        }
        accountProfile ||= normalizeLearnerProfile({})
        saveLearnerProfile(accountProfile)
        setProfile(accountProfile)
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setProfile(normalizeLearnerProfile({}))
      })
      .finally(() => setIsProfileLoading(false))
    return () => controller.abort()
  }, [userId])

  const effectiveId = resolveViewingCurriculum(profile.curriculum, viewingCurriculum)
  const curriculum = getCurriculum(effectiveId)
  const effectiveLevelId = curriculum.levels.some((level) => level.id === selectedLevelId)
    ? selectedLevelId
    : curriculum.levels.find((level) => level.label === profile.yearLevel)?.id || curriculum.levels[0]?.id || ''

  const setViewingCurriculum = useCallback((value: ViewingCurriculum) => {
    setViewingCurriculumState(value)
    setSelectedLevelIdState('')
    window.sessionStorage.setItem(VIEWING_KEY, value)
    window.sessionStorage.removeItem(LEVEL_KEY)
  }, [])

  const setSelectedLevelId = useCallback((value: string) => {
    setSelectedLevelIdState(value)
    window.sessionStorage.setItem(LEVEL_KEY, value)
  }, [])

  const saveProfile = useCallback(async (updates: Partial<LearnerProfile>) => {
    const next = saveLearnerProfile({ ...profile, ...updates, updatedAt: new Date().toISOString() })
    setProfile(next)
    if (user) {
      const response = await fetch('/api/app-state/learner-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Learner profile could not be saved.')
      const saved = normalizeLearnerProfile(payload.profile)
      saveLearnerProfile(saved)
      setProfile(saved)
      return saved
    }
    return next
  }, [profile, user])

  const value = useMemo(() => ({
    profile,
    viewingCurriculum,
    curriculum,
    selectedLevelId: effectiveLevelId,
    setViewingCurriculum,
    setSelectedLevelId,
    saveProfile,
    isProfileLoading
  }), [curriculum, effectiveLevelId, isProfileLoading, profile, saveProfile, setSelectedLevelId, setViewingCurriculum, viewingCurriculum])

  return <CurriculumContext.Provider value={value}>{children}</CurriculumContext.Provider>
}

export function useCurriculum() {
  const context = useContext(CurriculumContext)
  if (!context) throw new Error('useCurriculum must be used inside CurriculumProvider.')
  return context
}
