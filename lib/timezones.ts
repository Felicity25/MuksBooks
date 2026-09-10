import { isValidTimeZone } from './user-settings.ts'

const FALLBACK_TIME_ZONES = [
  'UTC',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'America/Chicago',
  'America/Los_Angeles',
  'America/New_York',
  'America/Toronto',
  'America/Vancouver',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Brisbane',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'Pacific/Auckland'
]

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: 'timeZone') => string[]
}

export function getSupportedTimeZones(intl: IntlWithSupportedValues = Intl): string[] {
  try {
    const supported = intl.supportedValuesOf?.('timeZone')
    if (supported?.length) return Array.from(new Set(['UTC', ...supported])).filter(isValidTimeZone)
  } catch {
    // Older browsers use the curated fallback below.
  }
  return FALLBACK_TIME_ZONES.filter(isValidTimeZone)
}

export function getBrowserTimeZone(): string | null {
  if (typeof Intl === 'undefined') return null
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
  return isValidTimeZone(detected) ? detected : null
}

export function resolveTimeZoneWhenMissing(savedTimeZone: unknown, browserTimeZone: unknown): string | undefined {
  if (isValidTimeZone(savedTimeZone)) return savedTimeZone
  return isValidTimeZone(browserTimeZone) ? browserTimeZone : undefined
}

export function getTimeZoneOffset(timeZone: string, date = new Date()): string {
  if (!isValidTimeZone(timeZone)) return 'UTC'
  const part = new Intl.DateTimeFormat('en', {
    timeZone,
    timeZoneName: 'shortOffset'
  }).formatToParts(date).find((item) => item.type === 'timeZoneName')?.value
  if (!part || part === 'GMT') return 'UTC+00:00'
  const match = part.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/)
  if (!match) return part.replace('GMT', 'UTC')
  return `UTC${match[1]}${match[2].padStart(2, '0')}:${match[3] || '00'}`
}

export function getTimeZoneLabel(timeZone: string, date = new Date()): string {
  const [region, ...locationParts] = timeZone.split('/')
  const location = (locationParts.join(' / ') || region).replace(/_/g, ' ')
  const regionLabel = locationParts.length ? region.replace(/_/g, ' ') : ''
  return `${location}${regionLabel ? `, ${regionLabel}` : ''} (${getTimeZoneOffset(timeZone, date)})`
}