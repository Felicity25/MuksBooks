import assert from 'node:assert/strict'
import { createApplication, universityStorage } from './storage.ts'
import { getModeAwareHomepageLayout, normalizeUserSettings } from '../user-settings.ts'

const values = new Map<string, string>()
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } }
})

universityStorage.saveShortlist(['uct-bsc-cs', 'uct-bsc-cs', 'monash-actuarial'])
assert.deepEqual(universityStorage.getShortlist(), ['uct-bsc-cs', 'monash-actuarial'], 'Guest shortlist should persist unique programme IDs')

universityStorage.saveCompare(['a', 'b', 'c', 'd', 'e'])
assert.deepEqual(universityStorage.getCompare(), ['a', 'b', 'c', 'd'], 'Comparison should be capped at four programmes')

const application = createApplication('uct-bsc-cs', 'uct')
universityStorage.saveApplications([application])
const reloaded = universityStorage.getApplications()
assert.equal(reloaded[0].programmeId, 'uct-bsc-cs')
assert.equal(reloaded[0].status, 'Interested')

const accountSettings = normalizeUserSettings({ universityShortlist: ['lse-economics'], universityCompare: ['a', 'a', 'b', 'c', 'd', 'e'], universityApplications: [{ ...application, status: 'Applied' }] })
assert.deepEqual(accountSettings.universityShortlist, ['lse-economics'])
assert.deepEqual(accountSettings.universityCompare, ['a', 'b', 'c', 'd'])
assert.equal(accountSettings.universityApplications[0].status, 'Applied')

const universityLayout = getModeAwareHomepageLayout('UNIVERSITY', [{ id: 'careers', size: 'large' }, { id: 'planner', size: 'medium' }])
assert.deepEqual(universityLayout.map((item) => item.id), ['careers', 'planner'], 'University mode should retain University-only widgets')
const learnerLayout = getModeAwareHomepageLayout('LEARNER', universityLayout)
assert.deepEqual(learnerLayout.map((item) => item.id), ['planner'], 'Learner mode should remove University-only widgets')

console.log('University workflow tests passed')
