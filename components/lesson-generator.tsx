'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface UnitMetadata {
  code?: string
  name?: string
  guideSummary?: string
}

export function LessonGenerator() {
  const [unit, setUnit] = useState('')
  const [topic, setTopic] = useState('')
  const [lessonObjectives, setLessonObjectives] = useState('')
  const [lessonText, setLessonText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [contextSummary, setContextSummary] = useState('')
  const [uploadedContext, setUploadedContext] = useState('')
  const [relevantChunks, setRelevantChunks] = useState<string[]>([])
  const [units, setUnits] = useState<UnitMetadata[]>([])
  const [masterySummary, setMasterySummary] = useState<string>('')
  const [taskSummary, setTaskSummary] = useState<string>('')
  const [plannerSummary, setPlannerSummary] = useState<string>('')
  const [settingsSummary, setSettingsSummary] = useState<string>('')

  useEffect(() => {
    const loadUnits = async () => {
      const response = await fetch('/api/app-state/lesson-context', { cache: 'no-store' })
      const payload = await response.json()
      if (payload?.ok && payload.data?.units) {
        setUnits(payload.data.units)
      }
    }
    void loadUnits()
  }, [])

  useEffect(() => {
    const loadContext = async () => {
      const params = new URLSearchParams()
      if (unit) params.set('unit', unit)
      if (topic) params.set('topic', topic)
      const response = await fetch(`/api/app-state/lesson-context?${params.toString()}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!payload?.ok || !payload?.data) return

      const data = payload.data
      setContextSummary(data.contextSummary || '')
      setUploadedContext(data.uploadedContext || '')
      setRelevantChunks(Array.isArray(data.relevantChunks) ? data.relevantChunks : [])
      setMasterySummary(data.masterySummary || '')
      setTaskSummary(data.taskSummary || '')
      setPlannerSummary(data.plannerSummary || '')
      setSettingsSummary(data.settingsSummary || '')
      if (Array.isArray(data.units)) {
        setUnits(data.units)
      }
    }

    void loadContext()
  }, [unit, topic])

  const generateLesson = async () => {
    if (!topic.trim()) return

    setIsLoading(true)
    setLessonText('')

    try {
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate a structured lesson for the topic: ${topic}.`,
          unit,
          topic,
          mode: 'lesson',
          lessonObjectives,
          contextSummary,
          uploadedContext,
          relevantChunks,
          masterySummary,
          taskSummary,
          plannerSummary,
          settingsSummary
        })
      })

      const data = await response.json()
      setLessonText(data.response || 'No lesson could be generated. Please try again.')
    } catch (error) {
      setLessonText('Failed to connect to the AI Tutor. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select unit</option>
              {units.map((unitItem) => (
                <option key={unitItem.code} value={unitItem.code || ''}>{unitItem.code || unitItem.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Survival analysis"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Objectives</label>
            <input
              type="text"
              value={lessonObjectives}
              onChange={(e) => setLessonObjectives(e.target.value)}
              placeholder="Learning outcomes or key focus"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Lesson context</p>
        <p className="text-sm leading-6 text-slate-600">The generator uses your unit guide, uploaded course material, and stored study data to build a lesson aligned with your current unit plan.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Unit guide summary</p>
            <p className="mt-2 text-sm text-slate-600">{contextSummary || 'No unit guide or study context yet.'}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Source material</p>
            <p className="mt-2 text-sm text-slate-600">{uploadedContext || 'No uploaded content available.'}</p>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={generateLesson} disabled={isLoading || !topic.trim()}>
          {isLoading ? 'Generating...' : 'Generate lesson'}
        </Button>
        <Button variant="outline" onClick={() => setLessonText('')}>
          Clear output
        </Button>
      </div>

      <Card className="space-y-4 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Generated lesson</p>
        <div className="whitespace-pre-line text-sm leading-6 text-slate-700">{lessonText || 'Your generated lesson will appear here once you click Generate lesson.'}</div>
      </Card>
    </div>
  )
}
