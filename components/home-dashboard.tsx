'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { onAppStateUpdate } from '@/lib/app-state/client-events'

interface DashboardData {
  todayTasks: Array<{ id: string; title: string; due_date?: string | null; planned_date?: string | null; course_code?: string | null }>
  upcomingAssessments: Array<{ id: string; name: string; due_date?: string | null; course_code?: string | null; weighting?: number | null }>
  activeCourses: Array<{ id: string; course_code: string; course_name?: string | null; avg_mastery?: number | null; topic_count?: number | null }>
  weakTopics: Array<{ id: string; name?: string | null; mastery_score?: number | null; course_code?: string | null }>
  recentResources: Array<{ id: string; filename: string; document_type?: string | null; course_code?: string | null; created_at: string }>
}

export function HomeDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [studyPlan, setStudyPlan] = useState<string | null>(null)

  const loadDashboard = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/app-state/dashboard', { cache: 'no-store' })
      const payload = await response.json()
      if (payload?.ok && payload.data) {
        setDashboard(payload.data)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard()

    const unsubscribe = onAppStateUpdate(() => {
      void loadDashboard()
    })

    return unsubscribe
  }, [])

  const homeCards = useMemo(() => {
    const activeCourses = dashboard?.activeCourses || []
    const weakTopics = dashboard?.weakTopics || []
    const semester = activeCourses[0]?.course_code ? 'Active semester' : 'No semester data yet'
    return [
      {
        label: 'Current semester',
        value: semester,
        hint: 'Planner and tutor now share the same persistent state.',
        link: '/planner'
      },
      {
        label: 'Units active',
        value: `${activeCourses.length} units`,
        hint: activeCourses.map((course) => course.course_code).slice(0, 4).join(', ') || 'Add your first unit in Units.',
        link: '/units'
      },
      {
        label: 'Weak topics',
        value: weakTopics.length ? weakTopics.map((topic) => topic.name || 'Untitled topic').slice(0, 2).join(', ') : 'No weak topics flagged',
        hint: 'Weakness is identified from topic mastery scores.',
        link: '/mastery'
      }
    ]
  }, [dashboard])

  const generateStudyPlan = () => {
    const weakTopic = dashboard?.weakTopics?.[0]
    const upcomingAssessment = dashboard?.upcomingAssessments?.[0]

    if (weakTopic && weakTopic.course_code) {
      setStudyPlan(`Focus on ${weakTopic.course_code}: target ${weakTopic.name || 'your weakest topic'} with a 45-minute retrieval session and 15 minutes of recap questions.`)
      return
    }

    if (upcomingAssessment && upcomingAssessment.course_code) {
      setStudyPlan(`Prepare ${upcomingAssessment.course_code} ${upcomingAssessment.name} using one concept review block and one timed practice block today.`)
      return
    }

    setStudyPlan('Create one focused block: 30 minutes concept review, 20 minutes worked examples, 10 minutes reflection notes.')
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Home dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Your semester study control centre</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              MuksBooks organises your units, tasks, uploads, planner and mastery progress in one academic workflow.
            </p>
          </div>
          <Button variant="default" onClick={generateStudyPlan}>Plan my next study session</Button>
        </div>

        {studyPlan && (
          <Card className="p-4 bg-green-50 border-green-200">
            <p className="text-sm font-semibold text-green-800">Suggested Study Plan:</p>
            <p className="mt-2 text-sm text-green-700">{studyPlan}</p>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {homeCards.map((card) => (
            <Link key={card.label} href={card.link}>
              <Card className="space-y-2 cursor-pointer hover:bg-slate-50 transition-colors">
                <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                <p className="text-2xl font-semibold text-slate-950">{card.value}</p>
                <p className="text-sm text-slate-500">{card.hint}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Today’s plan</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Focused revision for weak topics</h2>
            </div>
            <Badge>Priority</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(dashboard?.todayTasks || []).map((task) => (
              <div key={task.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{task.course_code || 'General'}</p>
                <p className="mt-2 text-sm text-slate-600">Due {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</p>
              </div>
            ))}
            {!isLoading && (dashboard?.todayTasks || []).length === 0 ? <p className="text-sm text-slate-600">No planned tasks yet. Add tasks in Planner.</p> : null}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Recent uploads</p>
              <p className="mt-1 text-sm text-slate-600">Find lecture slides, rubrics and briefs in your upload centre.</p>
            </div>
          </div>
          <div className="space-y-3">
            {(dashboard?.recentResources || []).map((upload) => (
              <div key={upload.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">{upload.filename}</p>
                    <p className="text-sm text-slate-500">{upload.document_type || 'Resource'} • {upload.course_code || 'Unclassified'}</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{new Date(upload.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {!isLoading && (dashboard?.recentResources || []).length === 0 ? <p className="text-sm text-slate-600">No uploaded resources yet.</p> : null}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Unit progress</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">Your current unit mastery</h2>
            </div>
          </div>
          <div className="space-y-4">
            {(dashboard?.activeCourses || []).map((unit) => {
              const progress = Math.round((unit.avg_mastery || 0) * 100)
              return (
              <div key={unit.id} className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{unit.course_code}</p>
                    <p className="text-sm text-slate-500">{unit.course_name || 'Course name unavailable'}</p>
                  </div>
                  <span className="text-sm font-semibold text-sky-700">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-400" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-sm text-slate-600">Tracked topics: {unit.topic_count || 0}</p>
              </div>
            )})}
            {!isLoading && (dashboard?.activeCourses || []).length === 0 ? <p className="text-sm text-slate-600">No active units yet. Add units to start tracking progress.</p> : null}
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Suggested next action</p>
          <p className="text-lg font-semibold text-slate-950">Generate a lesson for Hypothesis testing in ETC3460 and then quiz yourself.</p>
          <Link href="/ai-tutor">
            <Button variant="secondary">Start AI Tutor</Button>
          </Link>
        </Card>

        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Mastery pulse</p>
          <p className="text-sm text-slate-600">Your mastery levels are updated by lessons, quizzes, and feedback. Engage with weak topics this week for an HD target.</p>
          <div className="space-y-3">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                <span>Apply independently</span>
                <span>2 topics</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-2/3 rounded-full bg-slate-900" />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                <span>Exam ready</span>
                <span>1 topic</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-1/3 rounded-full bg-sky-700" />
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
