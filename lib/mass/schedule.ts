export type MassSyncMode = 'full' | 'delta'

export function getMassSyncMode(date: Date): MassSyncMode | null {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Melbourne',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date).map((part) => [part.type, part.value])
  )
  const hour = Number(parts.hour)
  const minute = Number(parts.minute)
  if (minute !== 0) return null
  if (hour === 7) return 'delta'
  if (hour === 20) return 'full'
  return null
}