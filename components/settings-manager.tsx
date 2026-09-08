'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DEFAULT_USER_SETTINGS, HOMEPAGE_PRESETS, PROACTIVITY_DEFAULTS, type HomepagePreset, type ProactivityControls, type ProactivityLevel, type ThemePreference, type UserSettings, type YearLevel } from '@/lib/user-settings'
import { THEMES } from '@/lib/design/themes'

const PRESET_LABELS: Record<HomepagePreset, string> = {
  'academic-weapon': 'Academic Weapon',
  'study-focus': 'Study Focus',
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
  'Actuarial', 'Finance', 'Data', 'Statistics', 'Technology',
  'Consulting', 'Economics', 'Insurance', 'Risk', 'Quantitative Finance'
]

const ACADEMIC_INTERESTS = [
  'Probability', 'Stochastic Processes', 'Loss Models', 'Machine Learning',
  'Econometrics', 'Financial Mathematics', 'Exam Strategy', 'Research Writing'
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

function toggle(list: string[], value: string, enabled: boolean) {
  if (enabled) return list.includes(value) ? list : [...list, value]
  return list.filter((item) => item !== value)
}

export function SettingsManager() {
  const { settings, saveSettings, isGuest } = useAuth()
  const [draft, setDraft] = useState(settings)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => setDraft(settings), [settings])

  const persist = async (updates: Partial<UserSettings>, confirmation = 'Settings saved.') => {
    const next = { ...draft, ...updates }
    setDraft(next)
    setSaving(true)
    try {
      const saved = await saveSettings(updates)
      setDraft(saved)
      setMessage(confirmation)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Settings could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const saveForm = (event: React.FormEvent) => {
    event.preventDefault()
    void persist(draft, 'Personalisation saved.')
  }

  const applyPreset = (preset: HomepagePreset) => {
    void persist({
      homepagePreset: preset,
      homepageLayout: HOMEPAGE_PRESETS[preset].map((item) => ({ ...item }))
    }, `${PRESET_LABELS[preset]} layout applied.`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-slate-600">{isGuest ? 'Guest personalisation stays on this device.' : 'Your personalisation syncs to your account.'}</p>
        {message ? <p className="font-medium text-emerald-700" role="status">{message}</p> : null}
      </div>

      <form onSubmit={saveForm} className="space-y-6">
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Personalisation</p>
              <h2 className="mt-2 text-section-title text-slate-950">Make MuksBooks yours</h2>
              <p className="mt-1 text-sm text-slate-600">Your personalised academia app. Choose how your workspace feels, then shape your profile.</p>
            </div>
            <Link href="/onboarding" className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Re-run onboarding</Link>
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
                    onClick={() => void persist({ theme: theme.id as ThemePreference }, `${theme.name} theme applied.`)}
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
              <select value={draft.textSize} onChange={(event) => void persist({ textSize: event.target.value as UserSettings['textSize'] }, 'Text size updated.')} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                <option value="small">Small</option>
                <option value="default">Default</option>
                <option value="large">Large</option>
                <option value="extra-large">Extra large</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Font style
              <select value={draft.font} onChange={(event) => void persist({ font: event.target.value as UserSettings['font'] }, 'Font updated.')} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                <option value="modern">Modern</option>
                <option value="readable">Readable</option>
                <option value="academic">Academic</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Interface density
              <select value={draft.density} onChange={(event) => void persist({ density: event.target.value as UserSettings['density'] }, 'Density updated.')} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Motion
              <select value={draft.motion} onChange={(event) => void persist({ motion: event.target.value as UserSettings['motion'] }, 'Motion preference updated.')} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                <option value="normal">Normal</option>
                <option value="reduced">Reduced</option>
              </select>
            </label>
          </div>

          <Button type="button" variant="outline" onClick={() => void persist({
            theme: DEFAULT_USER_SETTINGS.theme,
            textSize: DEFAULT_USER_SETTINGS.textSize,
            density: DEFAULT_USER_SETTINGS.density,
            motion: DEFAULT_USER_SETTINGS.motion,
            font: DEFAULT_USER_SETTINGS.font
          }, 'Appearance reset to Oxford.')}
          >
            Reset appearance
          </Button>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Academic profile</p>
            <p className="mt-1 text-sm text-slate-600">Stored now for profile use and future recommendations. You can change all fields later.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Academic mode
              <select value={draft.academicMode} onChange={(event) => setDraft({ ...draft, academicMode: event.target.value as UserSettings['academicMode'] })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                <option value="UNIVERSITY">University</option>
                <option value="LEARNER">School / Learner</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Preferred name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700">Institution / university<input value={draft.institution} onChange={(event) => setDraft({ ...draft, institution: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Monash University" /></label>
            <label className="text-sm font-medium text-slate-700">Degree<input value={draft.degree} onChange={(event) => setDraft({ ...draft, degree: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Bachelor of Actuarial Science" /></label>
            <label className="text-sm font-medium text-slate-700">Field of study<input value={draft.fieldOfStudy} onChange={(event) => setDraft({ ...draft, fieldOfStudy: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Actuarial Studies" /></label>
            <label className="text-sm font-medium text-slate-700">Major / specialisation<input value={draft.major} onChange={(event) => setDraft({ ...draft, major: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="Quantitative Finance" /></label>
            <label className="text-sm font-medium text-slate-700">Year level
              <select value={draft.yearLevel} onChange={(event) => setDraft({ ...draft, yearLevel: event.target.value as YearLevel })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                {YEAR_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Target marks<input value={draft.targetMarks} onChange={(event) => setDraft({ ...draft, targetMarks: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" placeholder="HD / 90+" /></label>
            <label className="text-sm font-medium text-slate-700">Feedback strictness<select value={draft.feedbackStrictness} onChange={(event) => setDraft({ ...draft, feedbackStrictness: event.target.value as UserSettings['feedbackStrictness'] })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"><option value="lenient">Lenient</option><option value="normal">Normal</option><option value="strict">Strict</option></select></label>
          </div>
          <Button type="submit" disabled={saving}>Save profile</Button>
        </Card>

        <Card className="space-y-4">
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
                      onChange={(event) => setDraft({ ...draft, careerInterests: toggle(draft.careerInterests, interest, event.target.checked) })}
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
                      onChange={(event) => setDraft({ ...draft, academicInterests: toggle(draft.academicInterests, interest, event.target.checked) })}
                      className="sr-only"
                    />
                    {interest}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <Button type="submit" disabled={saving}>Save interests</Button>
        </Card>

        <Card className="space-y-5">
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
        </Card>

        <Card className="space-y-5">
          <div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">MuksBooks assistance</p><h2 className="mt-2 text-xl font-semibold text-slate-950">How proactive should MuksBooks be?</h2><p className="mt-1 text-sm text-slate-600">Choose how often MuksBooks should actively recommend things to you.</p></div>
          <div className="grid gap-3 md:grid-cols-3">{(Object.keys(LEVELS) as ProactivityLevel[]).map((level) => <button key={level} type="button" onClick={() => void persist({ proactivityLevel: level, proactivityControls: PROACTIVITY_DEFAULTS[level] }, `${level} assistance applied.`)} className={`rounded-lg border p-4 text-left ${draft.proactivityLevel === level ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'}`}><span className="font-semibold text-slate-950">{level}</span><span className="mt-1 block text-sm text-slate-600">{LEVELS[level]}</span></button>)}</div>
          <div className="grid gap-5 md:grid-cols-2">{ASSISTANCE.map((group) => <fieldset key={group.title} className="rounded-lg border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-900">{group.title}</legend><div className="space-y-3">{group.items.map(([key, text]) => <label key={key} className="flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={draft.proactivityControls[key]} onChange={(event) => void persist({ proactivityControls: { ...draft.proactivityControls, [key]: event.target.checked } }, 'Assistance preference saved.')} className="mt-0.5 h-4 w-4" />{text}</label>)}</div></fieldset>)}</div>
        </Card>

        <Card className="space-y-4">
          <div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Study</p><p className="mt-1 text-sm text-slate-600">Time-based recommendations use your selected timezone.</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Timezone<input value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Pomodoro length<input type="number" min="5" max="90" value={draft.pomodoroLength} onChange={(event) => setDraft({ ...draft, pomodoroLength: Number(event.target.value) || 25 })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label></div>
          <Button type="submit" disabled={saving}>Save study settings</Button>
        </Card>
      </form>
    </div>
  )
}
