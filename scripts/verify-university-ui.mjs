import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const baseUrl = process.env.BASE_URL || 'http://localhost:3010'
const outputDirectory = '/tmp/muksbooks-build-3-5'
await mkdir(outputDirectory, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))

await page.goto(`${baseUrl}/universities/ul`, { waitUntil: 'load' })
await page.getByRole('heading', { name: 'University of Limpopo', exact: true }).waitFor()
await page.getByRole('heading', { name: 'Official sources' }).waitFor()
await page.getByRole('link', { name: 'Undergraduate guide 2027' }).waitFor()
await page.screenshot({ path: `${outputDirectory}/limpopo-sources-desktop.png`, fullPage: true })

await page.goto(`${baseUrl}/universities/ul/ul-mbchb`, { waitUntil: 'load' })
await page.getByRole('heading', { name: 'Bachelor of Medicine and Bachelor of Surgery' }).waitFor()
await page.getByRole('heading', { name: 'How to apply' }).waitFor()
await page.getByText('Faculty of Health Sciences').first().waitFor()

await page.goto(`${baseUrl}/universities/uq/uq-bachelor-of-economics`, { waitUntil: 'load' })
await page.getByRole('button', { name: 'Domestic' }).click()
await page.getByText('QTAC', { exact: true }).waitFor()
await page.getByRole('button', { name: 'International' }).click()
assert.equal(await page.getByText('QTAC', { exact: true }).count(), 0, 'International UQ route must not use QTAC')

await page.goto(`${baseUrl}/universities/applications`, { waitUntil: 'load' })
await page.getByRole('button', { name: 'Add application' }).click()
await page.getByLabel('University').fill('Example Global University')
await page.getByLabel('Programme').fill('Bachelor of Climate Science')
await page.getByLabel('Country').fill('New Zealand')
await page.getByLabel('Applicant type').selectOption('INTERNATIONAL')
await page.getByLabel('Application method').fill('Direct')
await page.getByLabel('Application URL').fill('https://example.edu/apply')
await page.getByLabel('Personal deadline').fill('2027-01-15')
await page.getByRole('button', { name: 'Create application' }).click()
await page.getByText('Bachelor of Climate Science').waitFor()
await page.getByText('Learner entered').waitFor()
await page.reload({ waitUntil: 'load' })
await page.getByText('Bachelor of Climate Science').waitFor()
await page.getByRole('link', { name: 'Open application' }).click()
await page.getByRole('button', { name: 'Create task' }).click()
await page.locator('label').filter({ hasText: 'Submit university application by personal deadline' }).waitFor()
await page.screenshot({ path: `${outputDirectory}/manual-application-desktop.png`, fullPage: true })

await page.goto(`${baseUrl}/universities/calendar`, { waitUntil: 'load' })
await page.getByLabel('Event type').selectOption('APPLICATIONS')
await page.getByLabel('Country').selectOption('United States')
await page.getByLabel('Institution').selectOption('mit')
await page.getByText('MIT Regular Action application deadline.').waitFor()
assert.equal(await page.getByText('VTAC timely course applications close.').count(), 0, 'Calendar institution filter should exclude unrelated dates')

await page.setViewportSize({ width: 390, height: 844 })
await page.goto(`${baseUrl}/universities/calendar`, { waitUntil: 'load' })
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
assert.ok(overflow <= 1, `Mobile calendar overflowed horizontally by ${overflow}px`)
await page.screenshot({ path: `${outputDirectory}/calendar-mobile.png`, fullPage: true })

assert.deepEqual(errors, [], `Browser page errors: ${errors.join('; ')}`)
await browser.close()
console.log(`University UI smoke tests passed. Screenshots: ${outputDirectory}`)