import type { ProactivityControls, ProactivityLevel } from '@/lib/user-settings'

export interface SuggestionInput {
  todayTasks: Array<{ id: string; title: string; due_date?: string | null; planned_date?: string | null; course_code?: string | null }>
  assessments: Array<{ id: string; name: string; due_date?: string | null; course_code?: string | null }>
  weakTopics: Array<{ id: string; name?: string | null; course_code?: string | null }>
  careerItems: Array<{ title: string; deadline_at_utc: string }>
  massItems: Array<{ id: string; title: string; category: string; startsAt?: string | null; url: string }>
}

export interface RankedSuggestion {
  id: string
  title: string
  detail: string
  href: string
  actionLabel: string
  score: number
  kind: 'assessment' | 'class' | 'overdue' | 'career' | 'mass' | 'review' | 'enrichment'
}

function daysUntil(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY
  return (new Date(value).getTime() - Date.now()) / 86_400_000
}

export function rankSuggestions(input: SuggestionInput, level: ProactivityLevel, controls: ProactivityControls) {
  const items: RankedSuggestion[] = []

  if (controls.assessmentPreparation) {
    for (const assessment of input.assessments) {
      const days = daysUntil(assessment.due_date)
      if (days > (level === 'proactive' ? 21 : level === 'balanced' ? 10 : 4)) continue
      items.push({ id: `assessment-${assessment.id}`, title: `Prepare ${assessment.name}`, detail: `${assessment.course_code || 'Assessment'}${Number.isFinite(days) ? ` · ${Math.max(0, Math.ceil(days))} days remaining` : ''}`, href: '/planner', actionLabel: 'Open Planner', score: 100 - Math.max(0, days), kind: 'assessment' })
    }
  }

  if (controls.catchUpTasks) {
    for (const task of input.todayTasks) {
      const overdue = daysUntil(task.due_date) < 0
      items.push({ id: `task-${task.id}`, title: task.title, detail: `${task.course_code || 'Study task'}${overdue ? ' · Overdue' : ' · Planned today'}`, href: '/planner', actionLabel: 'View task', score: overdue ? 82 : 88, kind: overdue ? 'overdue' : 'class' })
    }
  }

  if (controls.applicationActions) {
    input.careerItems.forEach((career, index) => items.push({ id: `career-${index}`, title: career.title, detail: 'Career action with a confirmed deadline.', href: '/careers', actionLabel: 'Open Careers', score: 55 - Math.max(0, daysUntil(career.deadline_at_utc)), kind: 'career' }))
  }

  if (controls.massEvents || controls.massProjects || controls.massCareers || controls.massAcademic) {
    input.massItems.forEach((event) => {
      const categoryAllowed = event.category === 'MASS Projects' ? controls.massProjects : event.category === 'Careers' ? controls.massCareers : event.category === 'Education' ? controls.massAcademic : controls.massEvents
      if (categoryAllowed) items.push({ id: `mass-${event.id}`, title: event.title, detail: `${event.category}${event.startsAt ? ` · ${new Date(event.startsAt).toLocaleDateString('en-AU')}` : ''}`, href: event.url, actionLabel: 'View event', score: 45 - Math.max(0, daysUntil(event.startsAt)), kind: 'mass' })
    })
  }

  if (level === 'proactive' && controls.deepDives && input.weakTopics[0]) {
    const topic = input.weakTopics[0]
    items.push({ id: `deep-${topic.id}`, title: `Deep Dive: ${topic.name || 'weak topic'}`, detail: `Build stronger understanding in ${topic.course_code || 'your current unit'}.`, href: '/ai-tutor', actionLabel: 'Ask Tutor', score: 25, kind: 'enrichment' })
  }

  const limit = level === 'quiet' ? 2 : level === 'balanced' ? 5 : 8
  return items.sort((left, right) => right.score - left.score).slice(0, limit)
}