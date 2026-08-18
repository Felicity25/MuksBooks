'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface UnitItem {
  code: string
  name: string
}

interface LessonContextDocument {
  id: string
  filename: string
  courseCode?: string
  documentType?: string
  week?: number
  processingStatus?: string
  indexingStatus?: string
}

interface LessonContextResponse {
  units: UnitItem[]
  contextSummary: string
  uploadedContext: string
  relevantChunks: string[]
  masterySummary: string
  taskSummary: string
  plannerSummary: string
  settingsSummary: string
  documents: LessonContextDocument[]
}

interface TutorApiContext {
  unitOptions: UnitOption[]
  resolvedUnit: string
  curriculumResourceSummary: string
  contextSummary: string
  uploadedContext: string
  relevantChunks: string[]
  unitContext: string
  masterySummary?: string
  taskSummary?: string
  plannerSummary?: string
  settingsSummary?: string
}

interface TutorSessionSnapshot {
  messages?: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp?: string
  }>
  input?: string
  unit?: string
  topic?: string
  mode?: string
}

interface AssignmentReviewItem {
  id?: string
  summary: string
}

interface UnitOption {
  code: string
  name: string
}

function normalizeUnitCode(value?: string) {
  return value?.toUpperCase().replace(/\s+/g, '') || ''
}

function buildUnitOptions(units: UnitItem[]) {
  return units
    .map((unit) => ({
      code: normalizeUnitCode(unit.code),
      name: unit.name || normalizeUnitCode(unit.code)
    }))
    .filter((unit) => Boolean(unit.code))
    .sort((a, b) => a.code.localeCompare(b.code))
}

function buildCurriculumSummary(documents: LessonContextDocument[]) {
  if (!documents.length) return 'No current uploaded curriculum resources detected.'
  return documents
    .map((document) => {
      const unit = document.courseCode ? `, ${document.courseCode}` : ''
      const type = document.documentType || 'resource'
      const status = document.indexingStatus || document.processingStatus || 'processing'
      const week = document.week ? `, Week ${document.week}` : ''
      return `${document.filename} (${type}${unit}${week}; ${status})`
    })
    .join(' | ')
}

async function fetchLessonContext(unit?: string, topic?: string): Promise<LessonContextResponse> {
  const params = new URLSearchParams()
  if (unit) params.set('unit', unit)
  if (topic) params.set('topic', topic)

  const query = params.toString()
  const response = await fetch(`/api/app-state/lesson-context${query ? `?${query}` : ''}`, { cache: 'no-store' })
  const payload = await response.json()

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || 'Failed to load Tutor context')
  }

  return payload.data as LessonContextResponse
}

async function buildTutorApiContext(unit: string, topic: string): Promise<TutorApiContext> {
  const requestedUnit = normalizeUnitCode(unit)
  const context = await fetchLessonContext(requestedUnit || undefined, topic || undefined)

  const unitOptions = buildUnitOptions(context.units || [])
  const fallbackUnit = unitOptions[0]?.code || ''
  const selectedExists = requestedUnit && unitOptions.some((option) => option.code === requestedUnit)
  const resolvedUnit = selectedExists ? requestedUnit : fallbackUnit

  const unitScopedContext = await fetchLessonContext(resolvedUnit || undefined, topic || undefined)
  const curriculumResourceSummary = buildCurriculumSummary(unitScopedContext.documents || [])
  const relevantChunks = Array.isArray(unitScopedContext.relevantChunks) ? unitScopedContext.relevantChunks : []
  const uploadedContext = unitScopedContext.uploadedContext || curriculumResourceSummary

  const unitContext = resolvedUnit
    ? `Selected unit: ${resolvedUnit}. Curriculum resources used: ${curriculumResourceSummary}`
    : 'No unit selected. No uploaded curriculum resources detected.'

  return {
    unitOptions,
    resolvedUnit,
    curriculumResourceSummary,
    contextSummary: unitScopedContext.contextSummary || 'No lesson context available.',
    uploadedContext,
    relevantChunks,
    unitContext,
    masterySummary: unitScopedContext.masterySummary,
    taskSummary: unitScopedContext.taskSummary,
    plannerSummary: unitScopedContext.plannerSummary,
    settingsSummary: unitScopedContext.settingsSummary
  }
}

function normalizeTutorOutput(content: string) {
  const lines = content.split(/\r?\n/)
  const transformed: string[] = []

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed) {
      transformed.push('')
      return
    }

    const sectionMatch = trimmed.match(/^Section:\s*(.+)$/i)
    if (sectionMatch?.[1]) {
      transformed.push(`\n${sectionMatch[1].toUpperCase()}\n`)
      return
    }

    if (/^Title$/i.test(trimmed)) {
      transformed.push('\nTITLE\n')
      return
    }

    transformed.push(line)
  })

  return transformed.join('\n')
}

function TutorMessageContent({ content }: { content: string }) {
  const normalized = normalizeTutorOutput(content)

  return (
    <div className="space-y-3 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
      {normalized}
    </div>
  )
}

export function AiTutorChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [unit, setUnit] = useState('')
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState('explain')
  const [isLoading, setIsLoading] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [contextSummary, setContextSummary] = useState('')
  const [uploadedContext, setUploadedContext] = useState('')
  const [relevantChunks, setRelevantChunks] = useState<string[]>([])
  const [unitContext, setUnitContext] = useState('')
  const [resolvedUnit, setResolvedUnit] = useState('')
  const [curriculumResourceSummary, setCurriculumResourceSummary] = useState('')
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([])
  const [masterySummary, setMasterySummary] = useState<string | undefined>(undefined)
  const [taskSummary, setTaskSummary] = useState<string | undefined>(undefined)
  const [plannerSummary, setPlannerSummary] = useState<string | undefined>(undefined)
  const [settingsSummary, setSettingsSummary] = useState<string | undefined>(undefined)

  const modes = ['explain', 'quiz', 'mark', 'diagnosis', 'plan', 'general']

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('aiTutorSession')
      if (savedSession) {
        const parsed = JSON.parse(savedSession) as TutorSessionSnapshot
        if (Array.isArray(parsed.messages)) {
          setMessages(parsed.messages.map((message) => ({
            ...message,
            timestamp: message.timestamp ? new Date(message.timestamp) : new Date()
          })))
        }
        if (typeof parsed.input === 'string') setInput(parsed.input)
        if (typeof parsed.unit === 'string') setUnit(parsed.unit)
        if (typeof parsed.topic === 'string') setTopic(parsed.topic)
        if (typeof parsed.mode === 'string') setMode(parsed.mode)
      }

      const query = new URLSearchParams(window.location.search)
      if (query.get('unit')) setUnit(normalizeUnitCode(query.get('unit') || ''))
      if (query.get('topic')) setTopic(query.get('topic') || '')
      if (query.get('prompt')) setInput(query.get('prompt') || '')
      if (query.get('mode') && modes.includes(query.get('mode') || '')) setMode(query.get('mode') || 'explain')
    } catch (error) {
      console.error('[AI Tutor] Failed to restore saved session', error)
    }
  }, [])

  useEffect(() => {
    const saveSession = () => {
      try {
        localStorage.setItem('aiTutorSession', JSON.stringify({
          messages: messages.map((message) => ({
            ...message,
            timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp
          })),
          input,
          unit,
          topic,
          mode
        }))
      } catch (error) {
        console.error('[AI Tutor] Failed to save session state', error)
      }
    }

    saveSession()
  }, [messages, input, unit, topic, mode])

  useEffect(() => {
    const loadContext = async () => {
      try {
        const apiContext = await buildTutorApiContext(unit, topic)
        setUnitOptions(apiContext.unitOptions)
        setResolvedUnit(apiContext.resolvedUnit)
        setCurriculumResourceSummary(apiContext.curriculumResourceSummary)
        setContextSummary(apiContext.contextSummary)
        setUploadedContext(apiContext.uploadedContext)
        setUnitContext(apiContext.unitContext)
        setRelevantChunks(apiContext.relevantChunks)
        setMasterySummary(apiContext.masterySummary)
        setTaskSummary(apiContext.taskSummary)
        setPlannerSummary(apiContext.plannerSummary)
        setSettingsSummary(apiContext.settingsSummary)

        if (unit && apiContext.resolvedUnit && normalizeUnitCode(unit) !== apiContext.resolvedUnit) {
          setUnit(apiContext.resolvedUnit)
        }
      } catch (error) {
        console.error('[AI Tutor] Failed to load context from AppState API', error)
        setCurriculumResourceSummary('No current uploaded curriculum resources detected.')
        setContextSummary('No persisted AppState context available right now.')
        setUploadedContext('')
        setUnitContext('No unit selected. No uploaded curriculum resources detected.')
        setRelevantChunks([])
      }
    }

    void loadContext()
  }, [unit, topic])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const assignmentReviews = JSON.parse(localStorage.getItem('assignmentReviews') || '[]') as AssignmentReviewItem[]
      const assignmentContext = assignmentReviews.length
        ? `Assignment review history contains ${assignmentReviews.length} entries.`
        : undefined

      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          unit: resolvedUnit || normalizeUnitCode(unit),
          topic,
          mode,
          availableUnits: unitOptions.map((option) => option.code),
          curriculumResourceSummary,
          contextSummary,
          unitContext,
          uploadedContext,
          masterySummary,
          taskSummary,
          plannerSummary,
          settingsSummary,
          assignmentContext,
          relevantChunks,
        })
      })

      const data = await response.json()
      if (data.demoMode) {
        setDemoMode(true)
      }

      if (response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${data.error || 'Something went wrong'}`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Error: Failed to connect to AI Tutor',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {demoMode && (
        <Card className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          AI Tutor is running in demo mode because no OpenAI API key is configured. Responses remain structured and useful, but enabling OPENAI_API_KEY will unlock full model performance.
        </Card>
      )}

      {/* Selectors */}
      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1 block w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Auto-detect from uploads</option>
              {unitOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} - {option.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">The tutor only draws from units found in your current uploaded curriculum resources.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Survival Analysis"
              className="mt-1 block w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="mt-1 block w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              {modes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Chat Area */}
      <Card className="h-[32rem] overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <div className="max-w-md space-y-2">
              <p className="text-base font-medium text-slate-900">Start a conversation with the AI Tutor</p>
              <p className="text-sm leading-6 text-slate-500">Choose one of your uploaded units, add a topic if needed, and ask a question. The tutor will use only the current curriculum resources.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl rounded-3xl px-4 py-3 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-900'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="font-sans">
                      <TutorMessageContent content={msg.content} />
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-7 text-white">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-xs rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  Thinking about your unit context...
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Input */}
      <Card className="p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask the AI Tutor..."
            className="flex-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()} className="rounded-2xl px-5">
            Send
          </Button>
        </div>
      </Card>
    </div>
  )
}