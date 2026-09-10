import assert from 'node:assert/strict'
import { DEFAULT_USER_SETTINGS, normalizeUserSettings, parseUserSettingsUpdate } from './user-settings.ts'

const legacySettings = normalizeUserSettings({
	academicMode: 'LEARNER',
	schoolCountry: 'South Africa',
	timezone: 'South Africa'
})
assert.equal(legacySettings.timezone, DEFAULT_USER_SETTINGS.timezone)
assert.equal(legacySettings.academicMode, 'LEARNER')
assert.doesNotThrow(() => new Intl.DateTimeFormat('en-AU', { timeZone: legacySettings.timezone }).format())

const invalidUpdate = parseUserSettingsUpdate({ timezone: 'South Africa' })
assert.equal(invalidUpdate.valid, false)

const validSettings = normalizeUserSettings({ timezone: 'Africa/Johannesburg' })
assert.equal(validSettings.timezone, 'Africa/Johannesburg')

console.log('user settings timezone tests passed')