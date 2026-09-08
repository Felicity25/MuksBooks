import { chromium } from 'playwright'

const baseUrl = process.env.MUKSBOOKS_QA_URL || 'http://127.0.0.1:3010'

const routes = [
  '/',
  '/study',
  '/planner',
  '/resources',
  '/careers',
  '/units',
  '/uploads',
  '/ai-tutor',
  '/semester-timeline',
  '/settings',
  '/onboarding',
  '/news',
  '/mastery'
]

const themes = [
  'muks-classic',
  'scholar-blue',
  'rose-espresso',
  'sage-library',
  'lavender-notes',
  'oxford',
  'matcha-study',
  'midnight',
  'golden-hour',
  'cloud'
]

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
]

function isLowContrast(rgbA, rgbB) {
  const toLinear = (c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const lum = (rgb) => 0.2126 * toLinear(rgb[0]) + 0.7152 * toLinear(rgb[1]) + 0.0722 * toLinear(rgb[2])
  const la = lum(rgbA)
  const lb = lum(rgbB)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  const ratio = (lighter + 0.05) / (darker + 0.05)
  return ratio < 4.5
}

function parseRgb(value) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

const browser = await chromium.launch({ headless: true })
const failures = []
const warnings = []

for (const viewport of viewports) {
  console.log(`[qa] viewport=${viewport.name}`)
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })

  for (const route of routes) {
    console.log(`[qa] route=${route}`)
    const url = `${baseUrl}${route}`
    const page = await context.newPage()
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      if (!response || !response.ok()) {
        for (const theme of themes) {
          failures.push(`${viewport.name} ${route} ${theme}: HTTP ${response?.status() ?? 'NO_RESPONSE'}`)
        }
        await page.close()
        continue
      }

      for (const theme of themes) {
        console.log(`[qa] check ${viewport.name} ${route} ${theme}`)
        await page.evaluate((activeTheme) => {
          document.documentElement.setAttribute('data-theme', activeTheme)
          document.documentElement.setAttribute('data-font', 'modern')
          document.documentElement.setAttribute('data-text-size', 'default')
          document.documentElement.setAttribute('data-density', 'comfortable')
          document.documentElement.setAttribute('data-motion', 'normal')
        }, theme)

        try {
          await page.waitForFunction(() => {
            const value = getComputedStyle(document.documentElement).getPropertyValue('--app-background')
            return Boolean(value && value.trim())
          }, { timeout: 5000 })

          await page.waitForTimeout(120)

          const evalResult = await page.evaluate(() => {
            const body = document.body
            const appBg = getComputedStyle(body).backgroundColor
            const text = getComputedStyle(body).color

            const tokenChecks = [
              '--app-background', '--surface', '--surface-secondary', '--sidebar', '--text-primary', '--primary', '--accent', '--border', '--focus'
            ]
            const missing = tokenChecks.filter((token) => !getComputedStyle(document.documentElement).getPropertyValue(token).trim())

            const docWidth = document.documentElement.scrollWidth
            const viewportWidth = window.innerWidth
            const hasOverflow = docWidth > viewportWidth + 2

            const errors = Array.from(document.querySelectorAll('[role="alert"]')).map((node) => (node.textContent || '').trim()).filter(Boolean)

            const clickableTargets = Array.from(document.querySelectorAll('button, a, input, select, textarea'))
              .slice(0, 200)
              .map((el) => {
                const rect = el.getBoundingClientRect()
                return { w: rect.width, h: rect.height, visible: rect.width > 0 && rect.height > 0 }
              })
            const tinyTargets = clickableTargets.filter((t) => t.visible && (t.w < 24 || t.h < 24)).length

            return {
              appBg,
              text,
              missing,
              hasOverflow,
              errors,
              tinyTargets
            }
          })

          if (evalResult.missing.length) warnings.push(`${viewport.name} ${route} ${theme}: missing tokens ${evalResult.missing.join(',')}`)
          if (evalResult.hasOverflow) warnings.push(`${viewport.name} ${route} ${theme}: horizontal overflow`)
          if (viewport.name === 'mobile' && evalResult.tinyTargets > 0) warnings.push(`${viewport.name} ${route} ${theme}: ${evalResult.tinyTargets} tiny tap targets`)
          if (evalResult.errors.length) failures.push(`${viewport.name} ${route} ${theme}: alert content present -> ${evalResult.errors[0]}`)

          const rgbA = parseRgb(evalResult.appBg)
          const rgbB = parseRgb(evalResult.text)
          if (rgbA && rgbB && isLowContrast(rgbA, rgbB)) {
            warnings.push(`${viewport.name} ${route} ${theme}: low body contrast`)
          }
        } catch (error) {
          failures.push(`${viewport.name} ${route} ${theme}: ${error instanceof Error ? error.message : String(error)}`)
        }

        // Small pacing gap avoids overloading local Next server during matrix runs.
        await page.waitForTimeout(40)
      }
    } catch (error) {
      for (const theme of themes) {
        failures.push(`${viewport.name} ${route} ${theme}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    await page.close()
  }

  await context.close()
}

await browser.close()

if (failures.length) {
  console.error('THEME_QA_FAILED')
  for (const item of failures) console.error(item)
  if (warnings.length) {
    console.error('THEME_QA_WARNINGS')
    for (const item of warnings) console.error(item)
  }
  process.exit(1)
}

console.log('THEME_QA_PASSED')
console.log(`Checked ${routes.length} routes x ${themes.length} themes x ${viewports.length} viewports`)
if (warnings.length) {
  console.log('THEME_QA_WARNINGS')
  for (const item of warnings) console.log(item)
}