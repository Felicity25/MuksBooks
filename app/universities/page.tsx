'use client'

import { useMemo, useState } from 'react'
import { ArrowUpRight, CheckCircle2, Globe2, Search, Target, TrendingUp } from 'lucide-react'
import { SectionShell } from '@/components/section-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const initialCourses = [
  { name: 'Actuarial Science', university: 'University of Melbourne', country: 'Australia', match: 'Likely eligible', reason: 'IB predicted total 41+, Maths HL 7', deadline: '2026-09-30' },
  { name: 'Economics', university: 'London School of Economics', country: 'United Kingdom', match: 'Close', reason: 'Strong predicted marks, subject prerequisites need review', deadline: '2026-10-15' },
  { name: 'Computer Science', university: 'University of Toronto', country: 'Canada', match: 'Aspirational', reason: 'Competitive grades and portfolio expectations', deadline: '2026-10-18' },
  { name: 'Medicine', university: 'Monash University', country: 'Australia', match: 'Unknown', reason: 'Requirements need verification against IB DP entry rules', deadline: '2026-11-02' }
]

export default function UniversitiesPage() {
  const [query, setQuery] = useState('')
  const [shortlist, setShortlist] = useState<string[]>(['Actuarial Science'])

  const filteredCourses = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return initialCourses
    return initialCourses.filter((course) => [course.name, course.university, course.country, course.reason].join(' ').toLowerCase().includes(value))
  }, [query])

  return (
    <SectionShell
      title="Universities"
      description="Course-first university planning and application tracking"
      actionLabel="Shortlist course"
      contentClassName="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]"
    >
      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <Search className="h-4 w-4 text-sky-700" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by interest, course, or university"
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full border border-slate-200 px-2 py-1">IB</span>
              <span className="rounded-full border border-slate-200 px-2 py-1">Australia</span>
              <span className="rounded-full border border-slate-200 px-2 py-1">UK</span>
              <span className="rounded-full border border-slate-200 px-2 py-1">Global</span>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {filteredCourses.map((course) => {
            const isShortlisted = shortlist.includes(course.name)
            return (
              <Card key={`${course.university}-${course.name}`} className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{course.name}</p>
                    <p className="text-sm text-slate-600">{course.university} • {course.country}</p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">{course.match}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{course.reason}</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Globe2 className="h-4 w-4" />
                    Official admissions page • Deadline {course.deadline}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" size="sm" className="gap-2">
                      Open course <ArrowUpRight className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant={isShortlisted ? 'default' : 'outline'} size="sm" onClick={() => setShortlist((current) => isShortlisted ? current.filter((item) => item !== course.name) : [...current, course.name])}>
                      {isShortlisted ? 'Shortlisted' : 'Shortlist'}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Target className="h-4 w-4 text-sky-700" />
            Match summary
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <span>Current profile</span>
              <span className="font-semibold text-slate-900">IB predicted 41</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <span>Top match</span>
              <span className="font-semibold text-emerald-700">Likely eligible</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <span>Priority gap</span>
              <span className="font-semibold text-slate-900">Maths HL and EE strength</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <TrendingUp className="h-4 w-4 text-sky-700" />
            Application tracker
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {shortlist.length} shortlisted courses</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Confirm prerequisite grades</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Review official deadlines</li>
          </ul>
          <Button type="button" className="mt-4 w-full">Manage applications</Button>
        </Card>
      </div>
    </SectionShell>
  )
}
