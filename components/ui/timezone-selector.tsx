'use client'

import { useMemo, useState } from 'react'
import { getSupportedTimeZones, getTimeZoneLabel } from '@/lib/timezones'

export function TimezoneSelector({
  value,
  onChange,
  id = 'timezone',
  disabled = false
}: {
  value: string
  onChange: (timeZone: string) => void
  id?: string
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const timeZones = useMemo(() => getSupportedTimeZones(), [])
  const options = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? timeZones.filter((timeZone) => `${timeZone} ${getTimeZoneLabel(timeZone)}`.toLowerCase().includes(needle))
      : timeZones
    return value && !filtered.includes(value) ? [value, ...filtered] : filtered
  }, [query, timeZones, value])

  return (
    <div className="mt-1 min-w-0 max-w-full space-y-2">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search city or region"
        aria-label="Search timezones"
        disabled={disabled}
        className="block min-w-0 max-w-full rounded-md border border-slate-300 bg-white px-3 py-2"
      />
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="block w-full min-w-0 max-w-full rounded-md border border-slate-300 bg-white px-3 py-2"
      >
        {options.map((timeZone) => <option key={timeZone} value={timeZone}>{getTimeZoneLabel(timeZone)}</option>)}
      </select>
      <p className="text-xs font-normal text-slate-500">{value}</p>
    </div>
  )
}