'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DEFAULT_USER_SETTINGS,
  HOMEPAGE_PRESETS,
  PROACTIVITY_DEFAULTS,
  type HomepagePreset,
  type ProactivityControls,
  type ProactivityLevel,
  type UserSettings
} from '@/lib/user-settings'

const PRESET_LABELS: Record<HomepagePreset, string> = {
  'academic-weapon': 'Academic Weapon',
  'study-focus': 'Study Focus',
  'career-focus': 'Career Focus',
  minimal: 'Minimal',
  'build-my-own': 'Build My Own'
}

const ASSISTANCE: Array<{ title: string; items: Array<[keyof ProactivityControls, string]> }> = [
  { title: 'Academic', items: [['lecturePreparation', 'Lecture preparation'], ['tutorialPreparation', 'Tutorial preparation'], ['workshopPreparation', 'Workshop preparation'], ['postClassReview', 'Post-class review'], ['assessmentPreparation', 'Assessment preparation'], ['catchUpTasks', 'Catch-up tasks']] },
  { title: 'Learning', items: [['deepDives', 'Deep Dives'], ['textbookResources', 'Textbook resources'], ['professionalResources', 'Professional actuarial resources'], ['distributionOfTheDay', 'Distribution of the Day']] },
  { title: 'Career', items: [['internshipsJobs', 'Internships and jobs'], ['applicationActions', 'Application actions'], ['careerEvents', 'Career events']] },
  { title: 'Community', items: [['massEvents', 'MASS events'], ['massProjects', 'MASS Projects opportunities'], ['massCareers', 'MASS career opportunities'], ['massAcademic', 'MASS academic events']] }
]

const LEVELS: Record<ProactivityLevel, string> = {
  quiet: 'Mostly stay out of the way.',
  balanced: 'Help me stay organised without overwhelming me.',
  proactive: 'Actively help me stay ahead.'
}

const appearanceOptions: Array<{ key: 'theme' | 'textSize' | 'density' | 'motion' | 'font'; label: string; values: string[] }> = [
  { key: 'theme', label: 'Theme', values: ['light', 'dark', 'system'] },
  { key: 'textSize', label: 'Text size', values: ['small', 'default', 'large', 'extra-large'] },
  { key: 'density', label: 'Interface density', values: ['compact', 'comfortable', 'spacious'] },
  { key: 'motion', label: 'Motion', values: ['normal', 'reduced'] },
  { key: 'font', label: 'Font', values: ['modern', 'readable', 'academic'] }
]

function label(value: string) {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
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
      setDraft(await saveSettings(next))
      setMessage(confirmation)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Settings could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const saveForm = (event: React.FormEvent) => {
    event.preventDefault()
    void persist(draft, 'Profile and study settings saved.')
  }

  const applyPreset = (preset: HomepagePreset) => void persist({
    homepagePreset: preset,
    homepageLayout: HOMEPAGE_PRESETS[preset].map((item) => ({ ...item }))
  }, `${PRESET_LABELS[preset]} layout applied.`)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <p className="text-slate-600">{isGuest ? 'Guest preferences stay on this device.' : 'Preferences sync to your account and other devices.'}</p>
        {message ? <p className="font-medium text-emerald-700" role="status">{message}</p> : null}
      </div>

      <form onSubmit={saveForm} className="space-y-6">
        <Card className="space-y-4">
          <div><p className="text-sm font-semibold uppercase text-slate-500">Profile</p><p className="mt-1 text-sm text-slate-600">Used for greetings and relevant study recommendations.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Preferred name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
            <label className="text-sm font-medium text-slate-700">Degree<input value={draft.degree} onChange={(event) => setDraft({ ...draft, degree: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="Bachelor of Actuarial Science" /></label>
            <label className="text-sm font-medium text-slate-700">Target marks<input value={draft.targetMarks} onChange={(event) => setDraft({ ...draft, targetMarks: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="HD / 90+" /></label>
            <label className="text-sm font-medium text-slate-700">Feedback strictness<select value={draft.feedbackStrictness} onChange={(event) => setDraft({ ...draft, feedbackStrictness: event.target.value as UserSettings['feedbackStrictness'] })} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="lenient">Lenient</option><option value="normal">Normal</option><option value="strict">Strict</option></select></label>
          </div>
          <Button type="submit" disabled={saving}>Save profile</Button>
        </Card>

        <Card className="space-y-5">
          <div><p className="text-sm font-semibold uppercase text-slate-500">Appearance</p><p className="mt-1 text-sm text-slate-600">Applies globally to navigation, forms, resources, Tutor, equations, and dashboards.</p></div>
          {appearanceOptions.map((option) => (
            <fieldset key={option.key}><legend className="text-sm font-medium text-slate-700">{option.label}</legend><div className="mt-2 flex flex-wrap gap-2">
              {option.values.map((value) => <Button key={value} type="button" size="sm" variant={draft[option.key] === value ? 'default' : 'outline'} onClick={() => void persist({ [option.key]: value } as Partial<UserSettings>, `${option.label} updated.`)}>{label(value)}</Button>)}
            </div></fieldset>
          ))}
          <Button type="button" variant="outline" onClick={() => void persist({ theme: DEFAULT_USER_SETTINGS.theme, textSize: DEFAULT_USER_SETTINGS.textSize, density: DEFAULT_USER_SETTINGS.density, motion: DEFAULT_USER_SETTINGS.motion, font: DEFAULT_USER_SETTINGS.font }, 'Interface settings reset.')}>Reset interface settings</Button>
        </Card>

        <Card className="space-y-5">
          <div><p className="text-sm font-semibold uppercase text-slate-500">Homepage</p><p className="mt-1 text-sm text-slate-600">Presets are starting points. Every widget remains movable, resizable, and optional.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(Object.keys(PRESET_LABELS) as HomepagePreset[]).map((preset) => <button key={preset} type="button" onClick={() => applyPreset(preset)} className={`rounded-lg border p-3 text-left text-sm ${draft.homepagePreset === preset ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}><span className="font-semibold">{PRESET_LABELS[preset]}</span><span className="mt-1 block text-xs opacity-75">{HOMEPAGE_PRESETS[preset].length || 'Choose every widget'} widgets</span></button>)}
          </div>
          <fieldset><legend className="text-sm font-medium text-slate-700">Quick actions</legend><div className="mt-3 flex flex-wrap gap-3">{([['upload', 'Upload'], ['ask-tutor', 'Ask Tutor'], ['add-task', 'Add Planner Task'], ['careers', 'Careers'], ['todays-classes', "Today's Classes"]] as const).map(([id, text]) => <label key={id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={draft.quickActions.includes(id)} onChange={(event) => void persist({ quickActions: event.target.checked ? [...draft.quickActions, id] : draft.quickActions.filter((item) => item !== id) }, 'Quick actions updated.')} />{text}</label>)}</div></fieldset>
          <Button type="button" variant="outline" onClick={() => applyPreset('academic-weapon')}>Restore recommended layout</Button>
        </Card>

        <Card className="space-y-5">
          <div><p className="text-sm font-semibold uppercase text-slate-500">MuksBooks Assistance</p><h2 className="mt-2 text-xl font-semibold text-slate-950">How proactive should MuksBooks be?</h2><p className="mt-1 text-sm text-slate-600">Choose how often MuksBooks should actively recommend things to you.</p></div>
          <div className="grid gap-3 md:grid-cols-3">{(Object.keys(LEVELS) as ProactivityLevel[]).map((level) => <button key={level} type="button" onClick={() => void persist({ proactivityLevel: level, proactivityControls: PROACTIVITY_DEFAULTS[level] }, `${label(level)} assistance applied.`)} className={`rounded-lg border p-4 text-left ${draft.proactivityLevel === level ? 'border-sky-600 bg-sky-50' : 'border-slate-200 bg-white'}`}><span className="font-semibold text-slate-950">{label(level)}{level === 'balanced' ? ' · Recommended' : ''}</span><span className="mt-1 block text-sm text-slate-600">{LEVELS[level]}</span></button>)}</div>
          <div className="grid gap-5 md:grid-cols-2">{ASSISTANCE.map((group) => <fieldset key={group.title} className="rounded-lg border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-900">{group.title}</legend><div className="space-y-3">{group.items.map(([key, text]) => <label key={key} className="flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={draft.proactivityControls[key]} onChange={(event) => void persist({ proactivityControls: { ...draft.proactivityControls, [key]: event.target.checked } }, 'Assistance preference saved.')} className="mt-0.5 h-4 w-4" />{text}</label>)}</div></fieldset>)}</div>
        </Card>

        <Card className="space-y-4">
          <div><p className="text-sm font-semibold uppercase text-slate-500">Study</p><p className="mt-1 text-sm text-slate-600">Time-based recommendations use your selected timezone.</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Timezone<input value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Pomodoro length<input type="number" min="5" max="90" value={draft.pomodoroLength} onChange={(event) => setDraft({ ...draft, pomodoroLength: Number(event.target.value) || 25 })} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label></div>
          <Button type="submit" disabled={saving}>Save study settings</Button>
        </Card>
      </form>
    </div>
  )
}