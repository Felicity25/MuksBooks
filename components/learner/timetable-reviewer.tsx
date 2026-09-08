'use client'

import { useEffect, useState } from 'react'
import { CalendarClock, Check, Plus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getLearnerProfile, saveLearnerProfile, type TimetableEntry } from '@/lib/learner/store'

export function TimetableReviewer() {
  const [lessons, setLessons] = useState<TimetableEntry[]>([])
  const [draft, setDraft] = useState({ day: 'Monday', time: '09:00', subject: '', teacher: '', room: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const profile = getLearnerProfile()
    setLessons(profile.timetable)
  }, [])

  const persist = (next: TimetableEntry[]) => {
    const profile = getLearnerProfile()
    const savedProfile = saveLearnerProfile({ ...profile, timetable: next, updatedAt: new Date().toISOString() })
    setLessons(savedProfile.timetable)
  }

  const addLesson = () => {
    if (!draft.subject.trim()) return

    const next = [{
      id: `${Date.now()}`,
      day: draft.day,
      time: draft.time,
      subject: draft.subject.trim(),
      teacher: draft.teacher.trim() || 'TBC',
      room: draft.room.trim() || 'TBC'
    }, ...lessons]

    persist(next)
    setDraft({ day: 'Monday', time: '09:00', subject: '', teacher: '', room: '' })
  }

  const saveTimetable = () => {
    setSaved(true)
    const profile = getLearnerProfile()
    saveLearnerProfile({ ...profile, timetable: lessons, updatedAt: new Date().toISOString() })
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <CalendarClock className="h-4 w-4 text-sky-700" />
          Timetable review before save
        </div>
        <Button type="button" onClick={saveTimetable} size="sm"><Save className="mr-2 h-4 w-4" />Save timetable</Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <select value={draft.day} onChange={(event) => setDraft({ ...draft, day: event.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
            <option key={day} value={day}>{day}</option>
          ))}
        </select>
        <input type="time" value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="Subject" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <input value={draft.teacher} onChange={(event) => setDraft({ ...draft, teacher: event.target.value })} placeholder="Teacher" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <div className="flex gap-2">
          <input value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} placeholder="Room" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          <Button type="button" variant="secondary" onClick={addLesson} size="sm"><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {lessons.map((lesson) => (
          <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <div>
              <p className="font-medium text-slate-900">{lesson.subject}</p>
              <p className="text-xs text-slate-500">{lesson.day} • {lesson.time} • {lesson.room}</p>
            </div>
            <span className="text-xs text-slate-500">{lesson.teacher}</span>
          </div>
        ))}
      </div>

      {saved ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <Check className="h-4 w-4" />
          Timetable saved and ready for AI planning.
        </div>
      ) : null}
    </Card>
  )
}
