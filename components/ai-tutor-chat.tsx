'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { useReadAloud } from '@/components/study/read-aloud-provider'

type TutorCitation = {
  id: string
  label: string
  unit?: string | null
  section?: string | null
  score?: number | null
}

type TutorMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  citations?: TutorCitation[]
  metadata?: Record<string, unknown>
}

type TutorConversation = {
  id: string
  title: string
  unit_id?: string | null
  active_unit_code?: string | null
  mode?: string | null
  created_at: string
  updated_at: string
}

type UnitOption = { code: string; name: string }

type LearningProfile = {
  preferred_depth: 'brief' | 'balanced' | 'deep'
  hint_style: 'progressive' | 'direct' | 'socratic'
  confidence_r: number
  recent_topics: string[]
  repeated_misconceptions: string[]
}

type RLabRunResult = {
  ok: boolean
  stdout: string
  stderr: string
  durationMs?: number
  error?: string
}

function normalizeUnitCode(value?: string) {
  return value?.toUpperCase().replace(/\s+/g, '') || ''
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed')
  }
  return payload as T
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose prose-slate max-w-none text-sm leading-7 prose-pre:rounded-2xl prose-pre:border prose-pre:border-slate-200 prose-pre:bg-slate-950 prose-pre:text-slate-100">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

function SourceChips({ citations }: { citations?: TutorCitation[] }) {
  if (!citations?.length) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {citations.slice(0, 6).map((citation) => (
        <span key={citation.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
          {citation.label}
          {citation.unit ? ` • ${citation.unit}` : ''}
        </span>
      ))}
    </div>
  )
}

function ComposerFileList({ files, onRemove }: { files: File[]; onRemove: (name: string) => void }) {
  if (!files.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((file) => (
        <button
          key={file.name}
          type="button"
          onClick={() => onRemove(file.name)}
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-slate-400"
        >
          {file.name} ×
        </button>
      ))}
    </div>
  )
}

export function AiTutorChat() {
  const { user, requireAuth } = useAuth()
  const readAloud = useReadAloud()

  const [conversations, setConversations] = useState<TutorConversation[]>([])
  const [conversationId, setConversationId] = useState<string>('')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [input, setInput] = useState('')
  const [unit, setUnit] = useState('')
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<'auto' | 'learn' | 'practice' | 'r_lab'>('auto')
  const [isLoading, setIsLoading] = useState(false)
  const [draftAssistant, setDraftAssistant] = useState('')
  const [activeCitations, setActiveCitations] = useState<TutorCitation[]>([])
  const [error, setError] = useState<string>('')
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([])
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null)
  const [showMemoryPanel, setShowMemoryPanel] = useState(false)
  const [composerFiles, setComposerFiles] = useState<File[]>([])
  const [rLabOpen, setRLabOpen] = useState(false)
  const [rCode, setRCode] = useState('set.seed(123)\nx <- rnorm(200)\nmean(x)\n')
  const [rOutput, setROutput] = useState<RLabRunResult | null>(null)
  const [rRunning, setRRunning] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [micStatus, setMicStatus] = useState('')

  async function copyToClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setMicStatus('Copied to clipboard.')
    } catch {
      setMicStatus('Copy failed in this browser.')
    }
  }

  const modes = useMemo(() => ([
    { value: 'auto', label: 'Auto' },
    { value: 'learn', label: 'Learn' },
    { value: 'practice', label: 'Practice' },
    { value: 'r_lab', label: 'R Lab' }
  ]), [])

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === conversationId),
    [conversations, conversationId]
  )

  async function loadUnits() {
    try {
      const payload = await fetchJson<{ ok: boolean; data: { units: Array<{ code: string; name: string }> } }>('/api/app-state/lesson-context')
      const units = Array.isArray(payload?.data?.units) ? payload.data.units : []
      const options = units
        .map((item) => ({ code: normalizeUnitCode(item.code), name: item.name || item.code }))
        .filter((item) => Boolean(item.code))
      setUnitOptions(options)
    } catch {
      setUnitOptions([])
    }
  }

  async function loadConversations() {
    if (!user) return
    try {
      const payload = await fetchJson<{ ok: boolean; conversations: TutorConversation[] }>('/api/ai-tutor/conversations', { cache: 'no-store' })
      setConversations(payload.conversations || [])
      if (!conversationId && payload.conversations?.[0]?.id) {
        const firstConversation = payload.conversations[0]
        setConversationId(firstConversation.id)
        setUnit(normalizeUnitCode(firstConversation.active_unit_code || ''))
        if (firstConversation.mode) {
          setMode(firstConversation.mode as typeof mode)
        }
      }
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load conversations')
    }
  }

  async function loadMessages(targetConversationId: string) {
    if (!targetConversationId) {
      setMessages([])
      return
    }

    if (!user) {
      const stored = localStorage.getItem(`aiTutorMessages:${targetConversationId}`)
      if (stored) {
        try {
          setMessages(JSON.parse(stored) as TutorMessage[])
          return
        } catch {
          setMessages([])
        }
      }
      return
    }

    try {
      const payload = await fetchJson<{ ok: boolean; messages: Array<any> }>(`/api/ai-tutor/conversations/${targetConversationId}/messages`, { cache: 'no-store' })
      setMessages((payload.messages || []).map((item) => ({
        id: item.id,
        role: item.role,
        content: item.content,
        createdAt: item.created_at,
        citations: item.citations || [],
        metadata: item.metadata || {}
      })))
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load conversation messages')
    }
  }

  async function loadLearningProfile() {
    if (!user) return
    try {
      const payload = await fetchJson<{ ok: boolean; profile: LearningProfile }>('/api/ai-tutor/learning-profile', { cache: 'no-store' })
      setLearningProfile(payload.profile)
    } catch {
      setLearningProfile(null)
    }
  }

  async function syncConversationContext(nextConversationId: string, nextUnit: string, nextMode: typeof mode) {
    if (!user || !nextConversationId) return
    await fetchJson(`/api/ai-tutor/conversations/${nextConversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitId: null,
        activeUnitCode: normalizeUnitCode(nextUnit) || null,
        mode: nextMode
      })
    })
  }

  useEffect(() => {
    void loadUnits()
  }, [])

  useEffect(() => {
    if (!user) {
      const guestConversationId = 'guest-default'
      setConversations([{ id: guestConversationId, title: 'Guest session', created_at: '', updated_at: '' } as TutorConversation])
      setConversationId(guestConversationId)
      void loadMessages(guestConversationId)
      return
    }

    void loadConversations()
    void loadLearningProfile()
  }, [user])

  useEffect(() => {
    void loadMessages(conversationId)
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return
    const activeConversation = conversations.find((conversation) => conversation.id === conversationId)
    if (!activeConversation) return

    const activeUnitCode = normalizeUnitCode(activeConversation.active_unit_code || '')
    if (activeUnitCode && activeUnitCode !== normalizeUnitCode(unit)) {
      setUnit(activeUnitCode)
    }
    if (activeConversation.mode && activeConversation.mode !== mode) {
      setMode(activeConversation.mode as typeof mode)
    }
  }, [conversationId, conversations, mode, unit])

  async function ensureConversation() {
    if (conversationId) return conversationId
    if (!user) {
      const guestConversationId = 'guest-default'
      setConversationId(guestConversationId)
      return guestConversationId
    }

    const created = await fetchJson<{ ok: boolean; conversation: TutorConversation }>('/api/ai-tutor/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Tutor ${new Date().toLocaleDateString()}`,
        unitId: null,
        activeUnitCode: normalizeUnitCode(unit),
        mode
      })
    })

    setConversations((current) => [created.conversation, ...current])
    setConversationId(created.conversation.id)
    return created.conversation.id
  }

  async function sendMessage(regenerateFromUserMessage?: string) {
    const trimmed = (regenerateFromUserMessage || input).trim()
    if (!trimmed) return

    if (!user && requireAuth('Sign in to persist tutor memory, conversations and learning profile.')) {
      // Allow guests to continue in local mode after showing auth prompt.
    }

    setError('')
    setIsLoading(true)
    setDraftAssistant('')
    setActiveCitations([])

    try {
      const activeConversationId = await ensureConversation()
      if (user) {
        await syncConversationContext(activeConversationId, unit, mode)
      }
      const userMessage: TutorMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString()
      }
      setMessages((current) => [...current, userMessage])
      if (!regenerateFromUserMessage) setInput('')

      const response = await fetch('/api/ai-tutor/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversationId,
          message: trimmed,
          unit: normalizeUnitCode(unit),
          topic,
          mode: mode === 'auto' ? 'general' : mode,
          sourceScope: 'unit',
          attachedFiles: composerFiles.map((file) => ({ name: file.name, size: file.size, type: file.type }))
        })
      })

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null)
        if (response.status === 401) {
          throw new Error(payload?.error || 'Sign in to use the paid Tutor AI.')
        }
        if (response.status === 429) {
          throw new Error(payload?.error || 'Tutor quota reached for the last 24 hours.')
        }
        throw new Error(payload?.error || 'Tutor request failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantText = ''
      let receivedMeta: { citations?: TutorCitation[] } = {}

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        while (buffer.includes('\n\n')) {
          const idx = buffer.indexOf('\n\n')
          const block = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)

          const eventLine = block.split('\n').find((line) => line.startsWith('event: '))
          const dataLine = block.split('\n').find((line) => line.startsWith('data: '))
          if (!eventLine || !dataLine) continue

          const eventType = eventLine.replace('event: ', '').trim()
          const eventPayload = JSON.parse(dataLine.replace('data: ', '')) as any

          if (eventType === 'chunk') {
            assistantText += String(eventPayload.text || '')
            setDraftAssistant(assistantText)
          }
          if (eventType === 'meta') {
            receivedMeta = eventPayload || {}
            setActiveCitations(Array.isArray(eventPayload?.citations) ? eventPayload.citations : [])
          }
          if (eventType === 'error') {
            throw new Error(String(eventPayload?.error || 'Stream error'))
          }
        }
      }

      const assistantMessage: TutorMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantText,
        createdAt: new Date().toISOString(),
        citations: receivedMeta.citations || []
      }

      setMessages((current) => [...current, assistantMessage])
      setDraftAssistant('')

      if (!user) {
        localStorage.setItem(`aiTutorMessages:${activeConversationId}`, JSON.stringify([...messages, userMessage, assistantMessage]))
      }

      if (user) {
        void loadLearningProfile()
        void loadConversations()
      }

      setComposerFiles([])
    } catch (sendError: any) {
      setError(sendError?.message || 'Failed to send message')
      setDraftAssistant('')
    } finally {
      setIsLoading(false)
    }
  }

  async function renameConversation(targetConversation: TutorConversation) {
    if (!user) return
    const title = window.prompt('Rename conversation', targetConversation.title || '')
    if (!title || title.trim() === targetConversation.title) return

    try {
      await fetchJson(`/api/ai-tutor/conversations/${targetConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() })
      })
      await loadConversations()
    } catch (renameError: any) {
      setError(renameError?.message || 'Rename failed')
    }
  }

  async function deleteConversation(targetConversation: TutorConversation) {
    if (!user) return
    if (!window.confirm('Delete this conversation and all messages?')) return

    try {
      await fetchJson(`/api/ai-tutor/conversations/${targetConversation.id}`, { method: 'DELETE' })
      const remaining = conversations.filter((item) => item.id !== targetConversation.id)
      setConversations(remaining)
      setConversationId(remaining[0]?.id || '')
      setMessages([])
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Delete failed')
    }
  }

  async function resetLearningMemory() {
    if (!user) return
    if (!window.confirm('Reset Tutor learning memory for your account?')) return
    try {
      await fetchJson('/api/ai-tutor/learning-profile', { method: 'DELETE' })
      await loadLearningProfile()
    } catch (memoryError: any) {
      setError(memoryError?.message || 'Failed to reset learning memory')
    }
  }

  async function runRCode() {
    setRRunning(true)
    setROutput(null)
    try {
      const payload = await fetchJson<RLabRunResult>('/api/ai-tutor/r-lab/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: rCode,
          files: []
        })
      })
      setROutput(payload)
    } catch (runError: any) {
      setROutput({ ok: false, stdout: '', stderr: '', error: runError?.message || 'R execution failed' })
    } finally {
      setRRunning(false)
    }
  }

  function startDictation() {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Recognition) {
      setMicStatus('Speech input is not supported in this browser.')
      return
    }

    const recognition = new Recognition()
    recognition.lang = 'en-AU'
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    setIsListening(true)
    setMicStatus('Listening...')

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result: any) => result[0]?.transcript || '')
        .join(' ')
        .trim()
      if (!transcript) return
      setInput((current) => `${current}${current ? ' ' : ''}${transcript}`)
    }

    recognition.onerror = () => {
      setMicStatus('Microphone capture failed. You can still type your question.')
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      setMicStatus('Dictation ended. Review transcript before sending.')
    }

    recognition.start()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="p-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Conversations</p>
          {user && (
            <Button size="sm" onClick={() => setConversationId('')}>New</Button>
          )}
        </div>
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <div key={conversation.id} className={`rounded-2xl border p-2 ${conversation.id === conversationId ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'}`}>
              <button className="w-full text-left" onClick={() => setConversationId(conversation.id)}>
                <p className="truncate text-sm font-medium text-slate-900">{conversation.title}</p>
                <p className="text-xs text-slate-500">{conversation.active_unit_code || 'No unit selected'}</p>
              </button>
              {user && (
                <div className="mt-2 flex gap-2">
                  <button className="text-xs text-slate-500 hover:text-slate-900" onClick={() => renameConversation(conversation)}>Rename</button>
                  <button className="text-xs text-rose-500 hover:text-rose-700" onClick={() => deleteConversation(conversation)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <button className="text-xs font-medium text-slate-600 hover:text-slate-900" onClick={() => setShowMemoryPanel((open) => !open)}>
            {showMemoryPanel ? 'Hide learning memory' : 'Learning memory'}
          </button>
          {showMemoryPanel && (
            <div className="mt-2 space-y-2 text-xs text-slate-600">
              <p>Depth: {learningProfile?.preferred_depth || 'balanced'}</p>
              <p>Hint style: {learningProfile?.hint_style || 'progressive'}</p>
              <p>Recent topics: {learningProfile?.recent_topics?.slice(0, 3).join(', ') || 'None yet'}</p>
              <p>Misconceptions: {learningProfile?.repeated_misconceptions?.slice(0, 3).join(', ') || 'None tracked'}</p>
              {user && <button className="text-rose-600 hover:text-rose-700" onClick={resetLearningMemory}>Reset memory</button>}
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Unit</label>
              <select
                value={unit}
                onChange={(event) => {
                  const nextUnit = normalizeUnitCode(event.target.value)
                  setUnit(nextUnit)
                  if (user && conversationId) {
                    void syncConversationContext(conversationId, nextUnit, mode)
                  }
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Auto from uploads</option>
                {unitOptions.map((option) => (
                  <option key={option.code} value={option.code}>{option.code} - {option.name}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">Context: {normalizeUnitCode(unit) || selectedConversation?.active_unit_code || 'General Tutor'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Topic</label>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. conditional expectation"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Mode</label>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as typeof mode)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                {modes.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card className="h-[34rem] overflow-y-auto p-4">
          {!messages.length && !draftAssistant ? (
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <div className="max-w-lg space-y-2 p-6">
                <p className="text-base font-semibold text-slate-900">Central Tutor is ready</p>
                <p className="text-sm text-slate-600">Ask about your current unit, request guided practice, or open R Lab to connect concepts to implementation.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl rounded-3xl px-4 py-3 ${message.role === 'user' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-900'}`}>
                    {message.role === 'assistant' ? (
                      <>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => readAloud.speakText(message.content)} aria-label="Read tutor response aloud">Read aloud</Button>
                          <Button size="sm" variant="outline" onClick={readAloud.readSelection} aria-label="Read selected text aloud">Read selection</Button>
                          <Button size="sm" variant="outline" onClick={() => { void copyToClipboard(message.content) }} aria-label="Copy tutor response">Copy</Button>
                        </div>
                        <MarkdownMessage content={message.content} />
                        <SourceChips citations={message.citations} />
                      </>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                        <div className="mt-2 flex gap-3">
                          <button className="text-xs text-slate-200 hover:text-white" onClick={() => setInput(message.content)}>Edit and resubmit</button>
                          <button className="text-xs text-slate-200 hover:text-white" onClick={() => void sendMessage(message.content)}>Retry</button>
                          <button className="text-xs text-slate-200 hover:text-white" onClick={() => { void copyToClipboard(message.content) }}>Copy</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <p className="font-medium text-slate-900">Tutor is working</p>
                    <p className="mt-1 text-xs text-slate-500">Retrieving unit sources, checking learning memory, then generating response.</p>
                    <div className="mt-2 flex gap-2 text-[11px] text-slate-500">
                      <span className="rounded-full border border-slate-200 px-2 py-0.5">Retrieval</span>
                      <span className="rounded-full border border-slate-200 px-2 py-0.5">Memory</span>
                      <span className="rounded-full border border-slate-200 px-2 py-0.5">Generation</span>
                    </div>
                    {draftAssistant ? <MarkdownMessage content={draftAssistant} /> : null}
                    {draftAssistant ? <SourceChips citations={activeCitations} /> : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-4">
          {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}
          {micStatus ? <p className="mb-2 text-xs text-slate-500" aria-live="polite">{micStatus}</p> : null}
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask for explanation, guided hint, practice, marking feedback, or R implementation..."
            rows={4}
            className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            disabled={isLoading}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:border-slate-500">
              Attach files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  const list = Array.from(event.target.files || [])
                  setComposerFiles((current) => [...current, ...list].slice(0, 8))
                }}
              />
            </label>

            <button
              type="button"
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:border-slate-500"
              onClick={startDictation}
              aria-label={isListening ? 'Microphone is currently active' : 'Start microphone dictation'}
              disabled={isLoading || isListening}
            >
              {isListening ? 'Listening...' : 'Microphone'}
            </button>

            <button type="button" className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:border-slate-500" onClick={readAloud.readSelection}>
              Read selection
            </button>

            <Button onClick={() => void sendMessage()} disabled={isLoading || !input.trim()}>
              Send
            </Button>

            <Button variant="secondary" onClick={() => setRLabOpen((open) => !open)}>
              {rLabOpen ? 'Hide R Lab' : 'Open R Lab'}
            </Button>
          </div>

          <ComposerFileList
            files={composerFiles}
            onRemove={(name) => setComposerFiles((current) => current.filter((file) => file.name !== name))}
          />
        </Card>

        {rLabOpen && (
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">R Lab</p>
                <p className="text-xs text-slate-500">Run R code in an isolated sandbox and ask Tutor about the results.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setRCode('')}>Reset</Button>
                <Button onClick={() => void runRCode()} disabled={rRunning || !rCode.trim()}>{rRunning ? 'Running...' : 'Run'}</Button>
              </div>
            </div>

            <textarea
              value={rCode}
              onChange={(event) => setRCode(event.target.value)}
              rows={10}
              className="w-full rounded-2xl border border-slate-300 bg-slate-950 px-3 py-3 font-mono text-xs text-slate-100"
              placeholder="# Write or paste R code here"
            />

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Console output</p>
              {rOutput ? (
                <div className="mt-2 space-y-2 text-xs">
                  <pre className="whitespace-pre-wrap text-slate-800">{rOutput.stdout || '(no stdout)'}</pre>
                  {rOutput.stderr ? <pre className="whitespace-pre-wrap text-rose-700">{rOutput.stderr}</pre> : null}
                  {rOutput.error ? <p className="text-rose-700">{rOutput.error}</p> : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">No run executed yet.</p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
