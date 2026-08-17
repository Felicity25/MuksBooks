'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { emitAppStateUpdate } from '@/lib/app-state/client-events'
import { useAuth } from '@/components/auth-provider'

interface Settings {
  theme: 'light' | 'dark' | 'system'
  name: string
  degree: string
  targetMarks: string
  feedbackStrictness: 'lenient' | 'normal' | 'strict'
  pomodoroLength: number
  studyTimes: string
}

export function SettingsManager() {
  const { requireAuth } = useAuth()
  const [settings, setSettings] = useState<Settings>({
    theme: 'light',
    name: '',
    degree: '',
    targetMarks: '',
    feedbackStrictness: 'normal',
    pomodoroLength: 25,
    studyTimes: ''
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/app-state/settings', { cache: 'no-store' })
      if (!response.ok) return
      const payload = await response.json().catch(() => null)
      if (payload?.ok && payload.settings) {
        setSettings(payload.settings)
      }
    }
    void load()
  }, [])

  const saveSettings = async (newSettings: Settings) => {
    setSettings(newSettings)
    const response = await fetch('/api/app-state/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error || 'Failed to save settings')
    }
    emitAppStateUpdate('settings')
    setMessage('Settings saved successfully!')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (requireAuth('Sign in to save your settings and profile.')) return
    try {
      await saveSettings(settings)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save settings')
    }
  }

  const updateSetting = (key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updateSetting('theme', theme)
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Profile</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Name"
              value={settings.name}
              onChange={(e) => updateSetting('name', e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Degree"
              value={settings.degree}
              onChange={(e) => updateSetting('degree', e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Target marks (e.g., HD/90+)"
              value={settings.targetMarks}
              onChange={(e) => updateSetting('targetMarks', e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={settings.feedbackStrictness}
              onChange={(e) => updateSetting('feedbackStrictness', e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="lenient">Lenient</option>
              <option value="normal">Normal</option>
              <option value="strict">Strict</option>
            </select>
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Interface settings</p>
          <div>
            <label className="block text-sm font-medium text-slate-700">Theme</label>
            <div className="mt-2 flex gap-2">
              {(['light', 'dark', 'system'] as const).map(theme => (
                <Button
                  key={theme}
                  type="button"
                  size="sm"
                  variant={settings.theme === theme ? 'default' : 'outline'}
                  onClick={() => handleThemeChange(theme)}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Study preferences</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Pomodoro length (minutes)</label>
              <input
                type="number"
                value={settings.pomodoroLength}
                onChange={(e) => updateSetting('pomodoroLength', parseInt(e.target.value) || 25)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                min="5"
                max="60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Preferred study times</label>
              <input
                type="text"
                placeholder="e.g., Mornings, Evenings"
                value={settings.studyTimes}
                onChange={(e) => updateSetting('studyTimes', e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </Card>

        <Button type="submit">Save Settings</Button>
      </form>

      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Onboarding & units</p>
        <p className="text-sm leading-6 text-slate-600">Re-run onboarding, manage academic years, semesters, units and topics.</p>
        <Button variant="outline">Re-run Onboarding</Button>
      </Card>
    </div>
  )
}