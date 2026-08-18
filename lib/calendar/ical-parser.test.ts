import assert from 'node:assert/strict'
import { parseICalendar } from './ical-parser'

const input = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Allocate+//Timetable//EN
BEGIN:VEVENT
UID:etc3420-lecture
DTSTART;TZID=Australia/Melbourne:20250804T100000
DTEND;TZID=Australia/Melbourne:20250804T120000
RRULE:FREQ=WEEKLY;COUNT=3
SUMMARY:ETC3420 Lecture
DESCRIPTION:Applied insurance methods L01
LOCATION:CL_12Rnf_01
END:VEVENT
BEGIN:VEVENT
UID:unknown-class
DTSTART;TZID=Australia/Melbourne:20250805T140000
DTEND;TZID=Australia/Melbourne:20250805T150000
SUMMARY:Guest seminar
LOCATION:Online
END:VEVENT
END:VCALENDAR`

const units = [{ id: 'unit-3420', code: 'ETC3420', name: 'Applied insurance methods' }]
const range = { start: new Date('2025-08-01T00:00:00Z'), end: new Date('2025-09-01T00:00:00Z') }
const events = parseICalendar(input, units, range)

assert.equal(events.length, 4)
assert.equal(events.filter((event) => event.sourceUid === 'etc3420-lecture').length, 3)
assert.equal(events[0].startsAt, '2025-08-04T00:00:00.000Z')
assert.equal(events[0].endsAt, '2025-08-04T02:00:00.000Z')
assert.equal(events[0].unitId, 'unit-3420')
assert.equal(events[0].activityType, 'Lecture')
assert.equal(events.find((event) => event.sourceUid === 'unknown-class')?.unitId, null)
assert.equal(new Set(events.map((event) => `${event.sourceUid}:${event.startsAt}`)).size, events.length)

console.log('ical-parser: all assertions passed')