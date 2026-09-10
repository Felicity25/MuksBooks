'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TimezoneSelector } from '@/components/ui/timezone-selector'
import { UniversityPlanningSettings } from '@/components/universities/university-planning-settings'
import { DEFAULT_USER_SETTINGS, HOMEPAGE_PRESETS, PROACTIVITY_DEFAULTS, type HomepagePreset, type ProactivityControls, type ProactivityLevel, type ThemePreference, type UserSettings, type YearLevel } from '@/lib/user-settings'
import { THEMES } from '@/lib/design/themes'
import { LearnerAcademicProfileSettings } from '@/components/learner/learner-academic-profile-settings'
import { mergeSettingsHydration, reconcileSavedFields } from '@/lib/settings-draft'

const PRESET_LABELS: Record<HomepagePreset, string> = {
  'academic-weapon': 'Academic Weapon',
  'study-focus': 'MuksFocus',
  'career-focus': 'Career Focus',
  minimal: 'Minimal',
  'build-my-own': 'Build My Own'
}

const LEVELS: Record<ProactivityLevel, string> = {
  quiet: 'Mostly stay out of the way.',
  balanced: 'Help me stay organised without overwhelm.',
  proactive: 'Actively help me stay ahead.'
}

const CAREER_INTERESTS = [
  'STEM', 'Economics', 'Biology', 'Engineering', 'Psychology',
  'Law', 'Languages', 'Design', 'Education', 'Health', 'Business', 'Finance',
  'Technology', 'Medicine', 'Public policy', 'Sustainability', 'Arts', 'Media'
]

const ACADEMIC_INTERESTS = [
  'Mathematics', 'Research', 'Scientific writing', 'Data analysis',
  'Essay structure', 'Exam strategy', 'Lab work', 'Presentation skills',
  'Computer science', 'Statistics', 'Economics', 'Literature', 'History',
  'Languages', 'Critical thinking', 'Problem solving', 'Oral practice', 'Revision planning'
]

const YEAR_LEVELS: Array<{ value: YearLevel; label: string }> = [
  { value: 'first-year', label: 'First year' },
  { value: 'second-year', label: 'Second year' },
  { value: 'third-year', label: 'Third year' },
  { value: 'fourth-year', label: 'Fourth year' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'other', label: 'Other' }
]

const ASSISTANCE: Array<{ title: string; items: Array<[keyof ProactivityControls, string]> }> = [
  { title: 'Academic', items: [['lecturePreparation', 'Lecture prep'], ['tutorialPreparation', 'Tutorial prep'], ['workshopPreparation', 'Workshop prep'], ['postClassReview', 'Post-class review'], ['assessmentPreparation', 'Assessment prep'], ['catchUpTasks', 'Catch-up tasks']] },
  { title: 'Learning', items: [['deepDives', 'Deep Dives'], ['textbookResources', 'Textbooks'], ['professionalResources', 'Professional resources'], ['distributionOfTheDay', 'Distribution of the Day']] },
  { title: 'Career', items: [['internshipsJobs', 'Internships/jobs'], ['applicationActions', 'Applications'], ['careerEvents', 'Career events']] },
  { title: 'Community', items: [['massEvents', 'MASS events'], ['massProjects', 'MASS projects'], ['massCareers', 'MASS careers'], ['massAcademic', 'MASS academic events']] }
]

type SettingsSection = 'profile' | 'academics' | 'study' | 'university' | 'appearance' | 'focus' | 'homepage'
type SaveState = { state: 'idle' | 'dirty' | 'saving' | 'saved' | 'error'; message?: string }

const SECTIONS: Array<{ id: SettingsSection; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'academics', label: 'Academics' },
  { id: 'study', label: 'Study preferences' },
  { id: 'university', label: 'University planning' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'focus', label: 'MuksFocus' },
  { id: 'homepage', label: 'Homepage' }
]

const SECTION_FIELDS: Record<SettingsSection, Array<keyof UserSettings>> = {
  profile: ['academicMode', 'name'],
  academics: ['institution', 'degree', 'fieldOfStudy', 'major', 'yearLevel', 'targetMarks', 'feedbackStrictness'],
  study: ['careerInterests', 'academicInterests', 'studyTimes', 'proactivityLevel', 'proactivityControls'],
  university: [],
  appearance: ['theme', 'textSize', 'density', 'motion', 'font'],
  focus: ['timezone', 'focusDurationMinutes', 'shortBreakMinutes', 'longBreakMinutes', 'focusCycleCount', 'autoStartBreaks', 'autoStartFocus', 'studyBellMuted', 'studyBellVolume', 'focusNotificationsEnabled'],
  homepage: ['homepagePreset', 'homepageLayout', 'quickActions']
}

function toggle(list: string[], value: string, enabled: boolean) {
  if (enabled) return list.includes(value) ? list : [...list, value]
  return list.filter((item) => item !== value)
}

export function SettingsManager() {
  const { settings, saveSettings, isGuest } = useAuth()
  const [draft, setDraft] = useState(settings)
  const draftRef = useRef(settings)
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [sectionStates, setSectionStates] = useState<Record<SettingsSection, SaveState>>(() => Object.fromEntries(SECTIONS.map(({ id }) => [id, { state: 'idle' }])) as Record<SettingsSection, SaveState>)
  const [dirtyFields, setDirtyFields] = useState<Set<keyof UserSettings>>(() => new Set())

  useEffect(() => {
    setDraft((current) => {
      const next = mergeSettingsHydration(current, settings, dirtyFields)
      draftRef.current = next
      return next
    })
  }, [dirtyFields, settings])

  const updateDraft = (section: SettingsSection, updates: Partial<UserSettings>) => {
    const next = { ...draftRef.current, ...updates }
    draftRef.current = next
    setDraft(next)
    setDirtyFields((current) => new Set([...current, ...(Object.keys(updates) as Array<keyof UserSettings>)]))
    setSectionStates((current) => ({ ...current, [section]: { state: 'dirty', message: 'Unsaved changes' } }))
  }

  const persist = async (section: SettingsSection, updates?: Partial<UserSettings>, confirmation = 'Saved.') => {
    const payload = updates ?? Object.fromEntries(SECTION_FIELDS[section].map((key) => [key, draftRef.current[key]])) as Partial<UserSettings>
    if (updates) updateDraft(section, updates)
    setSectionStates((current) => ({ ...current, [section]: { state: 'saving', message: 'Saving...' } }))
    try {
      await saveSettings(payload)
      setDirtyFields((current) => {
        const reconciled = reconcileSavedFields(current, payload, draftRef.current)
        if (reconciled.hasNewerEdits) setSectionStates((states) => ({ ...states, [section]: { state: 'dirty', message: 'Newer changes are not saved yet.' } }))
        return reconciled.dirtyFields
      })
      const reconciled = reconcileSavedFields(dirtyFields, payload, draftRef.current)
      if (!reconciled.hasNewerEdits) setSectionStates((current) => ({ ...current, [section]: { state: 'saved', message: confirmation } }))
    } catch (error) {
      setSectionStates((current) => ({ ...current, [section]: { state: 'error', message: error instanceof Error ? error.message : 'Settings could not be saved.' } }))
    }
  }

  const applyPreset = (preset: HomepagePreset) => {
    void persist('homepage', {
      homepagePreset: preset,
      homepageLayout: HOMEPAGE_PRESETS[preset].map((item) => ({ ...item }))
    }, `${PRESET_LABELS[preset]} layout applied.`)
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-slate-600">{isGuest ? 'Guest personalisation stays on this device.' : 'Your personalisation syncs to your account.'}</p>
        {sectionStates[activeSection].message ? <p className={`font-medium ${sectionStates[activeSection].state === 'error' ? 'text-rose-700' : sectionStates[activeSection].state === 'saved' ? 'text-emerald-700' : 'text-slate-600'}`} role="status">{sectionStates[activeSection].message}</p> : null}
      </div>

      <nav aria-label="Settings sections" className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        {SECTIONS.map((section) => <button key={section.id} type="button" onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? 'page' : undefined} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${activeSection === section.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{section.label}{sectionStates[section.id].state === 'dirty' ? ' *' : ''}</button>)}
      </nav>

      <form onSubmit={(event) => event.preventDefault()} className="space-y-6">
        {activeSection === 'profile' ? <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Profile</p><h2 className="mt-2 text-section-title text-slate-950">Your MuksBooks identity</h2></div><Link href="/onboarding" className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Re-run onboarding</Link></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Academic mode<select value={draft.academicMode} onChange={(event) => updateDraft('profile', { academicMode: event.target.value as UserSettings['academicMode'] })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"><option value="UNIVERSITY">University</option><option value="LEARNER">School / Learner</option></select></label>
            <label className="text-sm font-medium text-slate-700">Preferred name<input value={draft.name} onChange={(event) => updateDraft('profile', { name: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
          </div>
          <Button type="button" disabled={sectionStates.profile.state === 'saving'} onClick={() => void persist('profile')}>Save profile</Button>
        </Card> : null}

        {activeSection === 'appearance' ? (
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Appearance</p>
              <h2 className="mt-2 text-section-title text-slate-950">Make MuksBooks yours</h2>
              <p className="mt-1 text-sm text-slate-600">Choose how your workspace looks and feels.</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Theme</h3>
            <p className="mt-1 text-sm text-slate-600">Preview each environment before selecting. Theme updates apply immediately.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {THEMES.map((theme) => {
                const selected = draft.theme === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => void persist('appearance', { theme: theme.id as ThemePreference }, `${theme.name} theme applied.`)}
                    className={`rounded-lg border p-3 text-left transition ${selected ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-400'}`}
                  >
                    <div className="h-20 rounded-md border" style={{ borderColor: theme.preview.sidebar, backgroundColor: theme.preview.background }}>
                      <div className="flex h-full">
                        <div className="w-1/3 border-r px-1.5 py-1" style={{ backgroundColor: theme.preview.sidebar, borderColor: theme.preview.sidebar }}>
                          <div className="h-1.5 w-6 rounded-sm" style={{ backgroundColor: theme.preview.accent }} />
                          <div className="mt-1 h-1 w-8 rounded-sm" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }} />
                          <div className="mt-1 h-1 w-7 rounded-sm" style={{ backgroundColor: 'rgba(255,255,255,0.35)' }} />
                        </div>
                        <div className="flex-1 p-2" style={{ backgroundColor: theme.preview.background }}>
                          <div className="h-2.5 w-12 rounded-sm" style={{ backgroundColor: theme.preview.text, opacity: 0.75 }} />
                          <div className="mt-1 rounded-sm border px-1 py-1" style={{ borderColor: theme.preview.background, backgroundColor: theme.preview.surface }}>
                            <div className="h-1.5 w-10 rounded-sm" style={{ backgroundColor: theme.preview.text, opacity: 0.5 }} />
                            <div className="mt-1 h-1.5 w-8 rounded-sm" style={{ backgroundColor: theme.preview.accent }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{theme.name}</p>
                        <p className="text-xs text-slate-500">{theme.category}</p>
                      </div>
                      {selected ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Text size
              <select value={draft.textSize} onChange={(event) => void persist('appearance', { textSize: event.target.value as UserSettings['textSize'] }, 'Text size updated.')} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                <option value="small">Small</option>
                <option value="default">Default</option>
                <option value="large">Large</option>
                <option value="extra-large">Extra large</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Font style
              <select value={draft.font} onChange={(event) => void persist('appearance', { font: event.target.value as UserSettings['font'] }, 'Font updated.')} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                <option value="modern">Modern</option>
                <option value="readable">Readable</option>
                <option value="academic">Academic</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Interface density
              <select value={draft.density} onChange={(event) => void persist('appearance', { density: event.target.value as UserSettings['density'] }, 'Density updated.')} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Motion
              <select value={draft.motion} onChange={(event) => void persist('appearance', { motion: event.target.value as UserSettings['motion'] }, 'Motion preference updated.')} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                <option value="normal">Normal</option>
                <option value="reduced">Reduced</option>
              </select>
            </label>
          </div>

          <Button type="button" variant="outline" onClick={() => void persist('appearance', {
            theme: DEFAULT_USER_SETTINGS.theme,
            textSize: DEFAULT_USER_SETTINGS.textSize,
            density: DEFAULT_USER_SETTINGS.density,
            motion: DEFAULT_USER_SETTINGS.motion,
            font: DEFAULT_USER_SETTINGS.font
          }, 'Appearance reset to Oxford.')}
          >
            Reset appearance
          </Button>
        </Card>) : null}

        <div hidden={activeSection !== 'university'}>{draft.academicMode === 'LEARNER' ? <UniversityPlanningSettings /> : <Card className="space-y-3"><p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">University planning</p><p className="text-sm text-slate-600">University planning is available in School / Learner mode. Your University-mode Careers workspace remains unchanged.</p></Card>}</div>

        <div hidden={activeSection !== 'academics'}><Card className="space-y-4">
          {draft.academicMode === 'LEARNER' ? <LearnerAcademicProfileSettings /> : <>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Academic profile</p>
            <p className="mt-1 text-sm text-slate-600">Stored now for profile use and future recommendations. You can change all fields later.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">University or institution<input value={draft.institution} onChange={(event) => updateDraft('academics', { institution: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Monash University" /></label>
            <label className="text-sm font-medium text-slate-700">Academic track<input value={draft.degree} onChange={(event) => updateDraft('academics', { degree: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Bachelor of Actuarial Science" /></label>
            <label className="text-sm font-medium text-slate-700">Year level
              <select value={draft.yearLevel} onChange={(event) => updateDraft('academics', { yearLevel: event.target.value as YearLevel })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                {YEAR_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Target marks<input value={draft.targetMarks} onChange={(event) => updateDraft('academics', { targetMarks: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="HD / 90+" /></label>
            <label className="text-sm font-medium text-slate-700">Field of study<input value={draft.fieldOfStudy} onChange={(event) => updateDraft('academics', { fieldOfStudy: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Actuarial studies" /></label>
            <label className="text-sm font-medium text-slate-700">Major / specialisation<input value={draft.major} onChange={(event) => updateDraft('academics', { major: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Quantitative finance" /></label>
            <label className="text-sm font-medium text-slate-700">Feedback strictness<select value={draft.feedbackStrictness} onChange={(event) => updateDraft('academics', { feedbackStrictness: event.target.value as UserSettings['feedbackStrictness'] })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"><option value="lenient">Lenient</option><option value="normal">Normal</option><option value="strict">Strict</option></select></label>
          </div>
          <Button type="button" disabled={sectionStates.academics.state === 'saving'} onClick={() => void persist('academics')}>Save academics</Button>
          </>}
        </Card></div>

        {activeSection === 'study' ? <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Interests</p>
            <p className="mt-1 text-sm text-slate-600">These preferences prepare MuksBooks for personalised resources and careers matching.</p>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Career interests</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CAREER_INTERESTS.map((interest) => {
                const selected = draft.careerInterests.includes(interest)
                return (
                  <label key={interest} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => updateDraft('study', { careerInterests: toggle(draft.careerInterests, interest, event.target.checked) })}
                      className="sr-only"
                    />
                    {interest}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Academic interests</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ACADEMIC_INTERESTS.map((interest) => {
                const selected = draft.academicInterests.includes(interest)
                return (
                  <label key={interest} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => updateDraft('study', { academicInterests: toggle(draft.academicInterests, interest, event.target.checked) })}
                      className="sr-only"
                    />
                    {interest}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <label className="block text-sm font-medium text-slate-700">Preferred study times<input value={draft.studyTimes} onChange={(event) => updateDraft('study', { studyTimes: event.target.value })} placeholder="e.g. Weekday evenings" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
          <Button type="button" disabled={sectionStates.study.state === 'saving'} onClick={() => void persist('study')}>Save study preferences</Button>
        </Card> : null}

        {activeSection === 'homepage' ? <Card className="space-y-5">
          <div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Homepage</p><p className="mt-1 text-sm text-slate-600">Presets are starting points. Every widget remains movable, resizable, and optional.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(Object.keys(PRESET_LABELS) as HomepagePreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`rounded-lg border p-3 text-left text-sm ${draft.homepagePreset === preset ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
              >
                <span className="font-semibold">{PRESET_LABELS[preset]}</span>
                <span className="mt-1 block text-xs opacity-75">{HOMEPAGE_PRESETS[preset].length || 'Choose every widget'} widgets</span>
              </button>
            ))}
          </div>
        </Card> : null}

        {activeSection === 'study' ? <Card className="space-y-5">
          <div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">MuksBooks assistance</p><h2 className="mt-2 text-xl font-semibold text-slate-950">How proactive should MuksBooks be?</h2><p className="mt-1 text-sm text-slate-600">Choose how often MuksBooks should actively recommend things to you.</p></div>
          <div className="grid gap-3 md:grid-cols-3">{(Object.keys(LEVELS) as ProactivityLevel[]).map((level) => <button key={level} type="button" onClick={() => void persist('study', { proactivityLevel: level, proactivityControls: PROACTIVITY_DEFAULTS[level] }, `${level} assistance applied.`)} className={`rounded-lg border p-4 text-left ${draft.proactivityLevel === level ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'}`}><span className="font-semibold text-slate-950">{level}</span><span className="mt-1 block text-sm text-slate-600">{LEVELS[level]}</span></button>)}</div>
          <div className="grid gap-5 md:grid-cols-2">{ASSISTANCE.map((group) => <fieldset key={group.title} className="rounded-lg border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-900">{group.title}</legend><div className="space-y-3">{group.items.map(([key, text]) => <label key={key} className="flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={draft.proactivityControls[key]} onChange={(event) => void persist('study', { proactivityControls: { ...draft.proactivityControls, [key]: event.target.checked } }, 'Assistance preference saved.')} className="mt-0.5 h-4 w-4" />{text}</label>)}</div></fieldset>)}</div>
        </Card> : null}

        {activeSection === 'focus' ? <Card className="space-y-4">
          <div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">MuksFocus</p><p className="mt-1 text-sm text-slate-600">Time-based recommendations use your selected timezone.</p></div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <label className="min-w-0 text-sm font-medium text-slate-700">Timezone<TimezoneSelector value={draft.timezone} onChange={(timezone) => updateDraft('focus', { timezone })} /></label>
            <label className="text-sm font-medium text-slate-700">Focus duration (minutes)<input type="number" min="5" max="180" value={draft.focusDurationMinutes} onChange={(event) => updateDraft('focus', { focusDurationMinutes: Number(event.target.value) || 25 })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700">Short break (minutes)<input type="number" min="1" max="60" value={draft.shortBreakMinutes} onChange={(event) => updateDraft('focus', { shortBreakMinutes: Number(event.target.value) || 5 })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700">Long break (minutes)<input type="number" min="1" max="90" value={draft.longBreakMinutes} onChange={(event) => updateDraft('focus', { longBreakMinutes: Number(event.target.value) || 20 })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700">Focus cycles<input type="number" min="1" max="12" value={draft.focusCycleCount} onChange={(event) => updateDraft('focus', { focusCycleCount: Number(event.target.value) || 4 })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.autoStartBreaks} onChange={(event) => updateDraft('focus', { autoStartBreaks: event.target.checked })} />Automatically start breaks</label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.autoStartFocus} onChange={(event) => updateDraft('focus', { autoStartFocus: event.target.checked })} />Automatically start focus sessions</label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.focusNotificationsEnabled} onChange={(event) => updateDraft('focus', { focusNotificationsEnabled: event.target.checked })} />Focus notifications</label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.studyBellMuted} onChange={(event) => updateDraft('focus', { studyBellMuted: event.target.checked })} />Mute study bell</label>
            <label className="text-sm font-medium text-slate-700">Study bell volume<input type="range" min="0" max="1" step="0.05" value={draft.studyBellVolume} onChange={(event) => updateDraft('focus', { studyBellVolume: Number(event.target.value) })} className="mt-2 block w-full" /><span className="text-xs font-normal text-slate-500">{Math.round(draft.studyBellVolume * 100)}%</span></label>
          </div>
          <Button type="button" disabled={sectionStates.focus.state === 'saving'} onClick={() => void persist('focus')}>Save MuksFocus settings</Button>
        </Card> : null}
      </form>
    </div>
  )
}
