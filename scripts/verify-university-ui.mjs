import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const baseUrl = process.env.BASE_URL || 'http://localhost:3010'
const outputDirectory = '/tmp/muksbooks-build-4'
await mkdir(outputDirectory, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))

const unauthorizedReview = await page.request.get(`${baseUrl}/api/universities/review`)
assert.equal(unauthorizedReview.status(), 401, 'University review API must reject requests without the developer secret')

await page.goto(`${baseUrl}/universities/up`, { waitUntil: 'load' })
await page.getByRole('heading', { name: 'University of Pretoria', exact: true }).waitFor()
await page.getByRole('heading', { name: 'Official sources' }).waitFor()
await page.getByText('Automated access was blocked; another review pass is required.', { exact: false }).waitFor()
await page.screenshot({ path: `${outputDirectory}/pretoria-sources-desktop.png`, fullPage: true })

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

await page.goto(`${baseUrl}/universities/funding`, { waitUntil: 'load' })
await page.getByRole('heading', { name: 'Scholarships & Funding' }).waitFor()
await page.getByPlaceholder('Engineering bursary, NSFAS, Monash...').fill('NSFAS')
await page.getByRole('heading', { name: 'NSFAS DHET Bursary Scheme' }).waitFor()
await page.getByRole('link', { name: 'View details' }).click()
await page.getByRole('heading', { name: 'Published eligibility' }).waitFor()
await page.getByText('A match indicates published criteria may fit. It is not an award or eligibility guarantee.').waitFor()
await page.getByRole('button', { name: 'Start funding application' }).click()

await page.goto(`${baseUrl}/universities/funding/applications`, { waitUntil: 'load' })
await page.getByText('NSFAS DHET Bursary Scheme').waitFor()
await page.getByRole('button', { name: 'Add funding' }).click()
await page.getByLabel('Opportunity name').fill('Community education bursary')
await page.getByLabel('Provider').fill('Example Education Trust')
await page.getByLabel('Personal deadline').fill('2027-02-15')
await page.getByLabel('Official application URL').fill('https://example.edu/funding/apply')
await page.getByLabel('Expected amount').fill('10000')
await page.getByLabel('Currency').fill('ZAR')
await page.getByRole('button', { name: 'Add to tracker' }).click()
await page.getByText('Community education bursary').waitFor()
await page.reload({ waitUntil: 'load' })
await page.getByText('Community education bursary').waitFor()
await page.getByRole('link', { name: 'Open application' }).last().click()
await page.getByRole('heading', { name: 'Application destination' }).first().waitFor()
await page.getByText('Learner entered · not verified').waitFor()
await page.getByRole('link', { name: 'Open learner-entered link' }).waitFor()
await page.screenshot({ path: `${outputDirectory}/funding-application-desktop.png`, fullPage: true })

await page.goto(`${baseUrl}/universities/funding/plan`, { waitUntil: 'load' })
await page.getByRole('heading', { name: 'My Funding Plan' }).waitFor()
await page.getByText('Awarded or accepted only').waitFor()
await page.getByText('Not guaranteed or secured').waitFor()

await page.goto(`${baseUrl}/universities/mit/mit-course-6`, { waitUntil: 'load' })
await page.getByRole('heading', { name: 'Tuition & funding' }).waitFor()

await page.setViewportSize({ width: 390, height: 844 })
await page.goto(`${baseUrl}/universities/funding/applications`, { waitUntil: 'load' })
await page.getByRole('link', { name: 'Open application' }).last().click()
let overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
assert.ok(overflow <= 1, `Mobile funding application overflowed horizontally by ${overflow}px`)

await page.goto(`${baseUrl}/universities/funding/plan`, { waitUntil: 'load' })
overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
assert.ok(overflow <= 1, `Mobile funding plan overflowed horizontally by ${overflow}px`)

await page.goto(`${baseUrl}/universities/funding`, { waitUntil: 'load' })
overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
assert.ok(overflow <= 1, `Mobile funding discovery overflowed horizontally by ${overflow}px`)
await page.screenshot({ path: `${outputDirectory}/funding-mobile.png`, fullPage: true })

await page.goto(`${baseUrl}/universities/calendar`, { waitUntil: 'load' })
overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
assert.ok(overflow <= 1, `Mobile calendar overflowed horizontally by ${overflow}px`)
await page.screenshot({ path: `${outputDirectory}/calendar-mobile.png`, fullPage: true })

assert.deepEqual(errors, [], `Browser page errors: ${errors.join('; ')}`)
await browser.close()
console.log(`University UI smoke tests passed. Screenshots: ${outputDirectory}`)