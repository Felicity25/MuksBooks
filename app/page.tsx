'use client'

import { useState } from 'react'
import { GraduationCap, School } from 'lucide-react'
import { HomeDailyHub } from '@/components/dashboard/home-daily-hub'
import { PersonalHomeDashboard } from '@/components/dashboard/personal-home-dashboard'
import { useAuth } from '@/components/auth-provider'
import { UniversityPlanningPulse } from '@/components/universities/university-planning-pulse'
import { getLearnerProfile } from '@/lib/learner/store'

const MODE_OPTIONS = [
  {
    value: 'UNIVERSITY',
    label: 'University',
    summary: 'Degree study, units, assessments, planner, and careers.',
    icon: GraduationCap
  },
  {
    value: 'LEARNER',
    label: 'School',
    summary: 'School life, IB, subjects, timetable, assessments, and university planning.',
    icon: School
  }
] as const

export default function HomePage() {
  const { settings, saveSettings } = useAuth()
  const learnerProfile = getLearnerProfile()
  const [switchingMode, setSwitchingMode] = useState(false)
  const [modeMessage, setModeMessage] = useState('')
  const isLearnerMode = settings.academicMode === 'LEARNER'

  const handleModeChange = async (mode: 'UNIVERSITY' | 'LEARNER') => {
    if (mode === settings.academicMode) {
      setModeMessage(mode === 'LEARNER' ? 'School mode is already selected.' : 'University mode is already selected.')
      return
    }

    setSwitchingMode(true)
    try {
      await saveSettings({ academicMode: mode })
      setModeMessage(mode === 'LEARNER' ? 'School mode selected. Your learning workspace is now tailored for school life.' : 'University mode selected. Your workspace is now focused on university studies.')
    } finally {
      setSwitchingMode(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">MuksBooks</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Your personalised learning workspace</h1>
        <p className="mt-2 text-sm text-slate-600">For you, by you.</p>

        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-slate-50/80 p-4">
          <h2 className="text-lg font-semibold text-slate-900">How are you using MuksBooks?</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {MODE_OPTIONS.map((option) => {
              const Icon = option.icon
              const selected = settings.academicMode === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void handleModeChange(option.value)}
                  disabled={switchingMode}
                  aria-pressed={selected}
                  className={`rounded-xl border p-4 text-left transition ${selected ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-lg p-2 ${selected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-base font-semibold">{option.label}</span>
                    </div>
                    {selected ? <span className="text-xs font-medium uppercase tracking-[0.14em] opacity-80">Selected</span> : null}
                  </div>
                  <p className={`mt-3 text-sm ${selected ? 'text-slate-200' : 'text-slate-600'}`}>{option.summary}</p>
                </button>
              )
            })}
          </div>
          {modeMessage ? <p className="mt-3 text-sm text-slate-700">{modeMessage}</p> : null}
        </div>

        {isLearnerMode ? (
          <p className="mt-3 text-sm text-slate-700">
            {learnerProfile.curriculumLabel || learnerProfile.curriculum || 'IB'} • {learnerProfile.school?.name || 'School profile in progress'} • {learnerProfile.yearLevel || 'Year 12'}
          </p>
        ) : null}
      </div>
      {isLearnerMode ? <UniversityPlanningPulse /> : null}
      <HomeDailyHub />
      <PersonalHomeDashboard />
    </div>
  )
}
