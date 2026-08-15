'use client'

import { useEffect } from 'react'

export function AppStateMigrator() {
  useEffect(() => {
    const run = async () => {
      const migratedFlag = localStorage.getItem('appStateMigratedV1')
      if (migratedFlag === 'true') return

      const units = JSON.parse(localStorage.getItem('units') || '[]')
      const studySessions = JSON.parse(localStorage.getItem('studySessions') || '[]')
      const settings = JSON.parse(localStorage.getItem('settings') || '{}')

      const hasData = units.length > 0 || studySessions.length > 0 || Object.keys(settings).length > 0
      if (!hasData) {
        localStorage.setItem('appStateMigratedV1', 'true')
        return
      }

      try {
        const response = await fetch('/api/app-state/migrate-local-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ units, studySessions, settings })
        })

        if (response.ok) {
          localStorage.setItem('appStateMigratedV1', 'true')
        }
      } catch {
        // Keep silent so the app continues even if migration fails.
      }
    }

    void run()
  }, [])

  return null
}
