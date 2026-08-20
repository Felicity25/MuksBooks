'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import {
  ChevronDown,
  Expand,
  FlaskConical,
  Mic,
  Minimize2,
  PanelLeft,
  PanelLeftClose,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Wrench,
  X
} from 'lucide-react'
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
  source_scope?: {
    unitSelectionMode?: 'general' | 'auto' | 'manual'
    selectedUnitCode?: string | null
    detectedUnitCode?: string | null
  } | null
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

const UNIT_CHOICE_GENERAL = ''
const UNIT_CHOICE_AUTO = '__AUTO__'

function getUnitSelectionMode(unitChoice: string): 'general' | 'auto' | 'manual' {
  if (unitChoice === UNIT_CHOICE_AUTO) return 'auto'
  if (!unitChoice) return 'general'
  return 'manual'
}

function getManualUnitCode(unitChoice: string) {
  return getUnitSelectionMode(unitChoice) === 'manual' ? normalizeUnitCode(unitChoice) : null
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(payload?.error || 'Request failed') as Error & { code?: string; status?: number }
    error.code = payload?.code
    error.status = response.status
    throw error
  }
  return payload as T
}

function normalizeTutorMathDelimiters(value: string) {
  const normalizeMathBody = (body: string) => body.replace(/\\\\/g, '\\')

  return value
    .replace(/(?<!\\)\$(?=\d)/g, '\\$')
    .replace(/\\+\[([\s\S]+?)\\+\]/g, (_match: string, body: string) => `$$${normalizeMathBody(body)}$$`)
    .replace(/\\+\(([\s\S]+?)\\+\)/g, (_match: string, body: string) => `$${normalizeMathBody(body)}$`)
}

function MarkdownMessage({ content }: { content: string }) {
  const normalizedContent = useMemo(() => normalizeTutorMathDelimiters(content), [content])

  return (
    <div className="prose prose-slate max-w-none text-[15px] leading-8 prose-headings:scroll-mt-24 prose-headings:font-semibold prose-h2:mt-8 prose-h2:text-2xl prose-h3:mt-6 prose-h3:text-xl prose-p:text-slate-800 prose-li:my-1 prose-ul:my-4 prose-ol:my-4 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:border prose-pre:border-slate-200 prose-pre:bg-slate-950 prose-pre:text-slate-100 prose-code:text-[0.95em] prose-p:break-words prose-table:block prose-table:overflow-x-auto prose-table:whitespace-nowrap prose-img:max-w-full">
      <ReactMarkdown remarkPlugins={[[remarkMath, { singleDollarTextMath: true }], remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {normalizedContent}
      </ReactMarkdown>
    </div>
  )
}

function SourceChip({
  citations,
  open,
  onToggle
}: {
  citations?: TutorCitation[]
  open: boolean
  onToggle: () => void
}) {
  if (!citations?.length) return null
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300"
      >
        Sources {citations.length}
        <ChevronDown size={12} className={open ? 'rotate-180' : ''} />
      </button>
      {open ? (
        <div className="mt-2 space-y-1 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
          {citations.slice(0, 8).map((citation) => (
            <p key={citation.id}>
              {citation.label}
              {citation.section ? ` · ${citation.section}` : ''}
              {citation.unit ? ` · ${citation.unit}` : ''}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ClaudeWorkspace({
  artifactUrl,
  expanded,
  onToggleExpanded
}: {
  artifactUrl: string
  expanded: boolean
  onToggleExpanded: () => void
}) {
  const trimmedUrl = artifactUrl.trim()
  const hasEmbedUrl = Boolean(trimmedUrl)
  const blockedClaudeChatUrl = /claude\.ai/i.test(trimmedUrl)
  const canEmbed = hasEmbedUrl && !blockedClaudeChatUrl

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Claude workspace</p>
          <p className="text-xs text-slate-500">Runs on your Claude account and Claude usage limits.</p>
        </div>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:border-slate-300"
          aria-label={expanded ? 'Restore workspace size' : 'Expand workspace'}
        >
          {expanded ? <Minimize2 size={15} /> : <Expand size={15} />}
        </button>
      </div>

      {canEmbed ? (
        <iframe
          title="Claude Artifact Workspace"
          src={trimmedUrl}
          className="h-full min-h-[65vh] w-full border-0"
          allow="clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="space-y-4 p-5 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Claude Artifact embed is not configured yet.</p>
          {blockedClaudeChatUrl ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
              Direct claude.ai chat URLs are not supported here. Use a published Artifact embed URL from Claude &quot;Get embed code&quot;.
            </p>
          ) : null}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
            <p className="font-semibold text-slate-900">Setup steps</p>
            <p>1. In Claude, open your Artifact and click Publish.</p>
            <p>2. Click Get embed code and set Allowed domains (include muksbooks.com and your preview domains).</p>
            <p>3. Copy the embed URL and set NEXT_PUBLIC_CLAUDE_ARTIFACT_EMBED_URL.</p>
            <p>4. Redeploy MuksBooks.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 text-xs leading-6 text-slate-600">
            <p className="font-semibold text-slate-900">Capability boundary</p>
            <p>MuksBooks Tutor uses your units/uploads/schedule context.</p>
            <p>Claude workspace uses Claude authentication and Claude usage allowances.</p>
            <p>No implicit Supabase or MuksBooks data bridge is assumed in the Artifact.</p>
          </div>
        </div>
      )}
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
  const claudeArtifactUrl = process.env.NEXT_PUBLIC_CLAUDE_ARTIFACT_EMBED_URL || ''

  const [conversations, setConversations] = useState<TutorConversation[]>([])
  const [conversationId, setConversationId] = useState<string>('')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [input, setInput] = useState('')
  const [selectedUnitChoice, setSelectedUnitChoice] = useState<string>(UNIT_CHOICE_GENERAL)
  const [detectedUnitCode, setDetectedUnitCode] = useState<string | null>(null)
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showContextPicker, setShowContextPicker] = useState(false)
  const [showContextDetails, setShowContextDetails] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [expandedSourcesMessageId, setExpandedSourcesMessageId] = useState<string | null>(null)
  const [workspace, setWorkspace] = useState<'tutor' | 'claude'>('tutor')
  const [focusMode, setFocusMode] = useState(false)
  const [claudeExpanded, setClaudeExpanded] = useState(false)

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

  const unitSelectionMode = useMemo(() => getUnitSelectionMode(selectedUnitChoice), [selectedUnitChoice])
  const manualUnitCode = useMemo(() => getManualUnitCode(selectedUnitChoice), [selectedUnitChoice])

  const contextLabel = useMemo(() => {
    if (unitSelectionMode === 'manual') {
      return `Context: ${manualUnitCode || 'General'}`
    }
    if (unitSelectionMode === 'auto') {
      return `Context: Auto → ${detectedUnitCode || 'General'}`
    }
    return 'Context: General'
  }, [unitSelectionMode, manualUnitCode, detectedUnitCode])

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === conversationId) || null,
    [conversations, conversationId]
  )

  const contextChipLabel = useMemo(() => {
    if (unitSelectionMode === 'manual') return manualUnitCode || 'General'
    if (unitSelectionMode === 'auto') return `Auto${detectedUnitCode ? ` · ${detectedUnitCode}` : ''}`
    return 'General'
  }, [unitSelectionMode, manualUnitCode, detectedUnitCode])

  const latestAssistantCitations = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const item = messages[index]
      if (item.role === 'assistant' && item.citations?.length) return item.citations
    }
    return activeCitations
  }, [messages, activeCitations])

  function applyConversationUnitContext(conversation?: TutorConversation) {
    if (!conversation) {
      setSelectedUnitChoice(UNIT_CHOICE_GENERAL)
      setDetectedUnitCode(null)
      return
    }

    const scope = conversation.source_scope || {}
    const storedMode = scope.unitSelectionMode
    const storedSelected = normalizeUnitCode(scope.selectedUnitCode || '')
    const storedDetected = normalizeUnitCode(scope.detectedUnitCode || '') || null
    const activeUnit = normalizeUnitCode(conversation.active_unit_code || '')

    if (storedMode === 'auto') {
      setSelectedUnitChoice(UNIT_CHOICE_AUTO)
      setDetectedUnitCode(storedDetected || null)
      return
    }

    if (storedMode === 'manual') {
      const nextManual = storedSelected || activeUnit
      setSelectedUnitChoice(nextManual || UNIT_CHOICE_GENERAL)
      setDetectedUnitCode(null)
      return
    }

    if (storedMode === 'general') {
      setSelectedUnitChoice(UNIT_CHOICE_GENERAL)
      setDetectedUnitCode(storedDetected || null)
      return
    }

    if (activeUnit) {
      setSelectedUnitChoice(activeUnit)
      setDetectedUnitCode(null)
      return
    }

    setSelectedUnitChoice(UNIT_CHOICE_GENERAL)
    setDetectedUnitCode(null)
  }

  function applyUnitChoice(rawChoice: string) {
    const nextChoice = rawChoice === UNIT_CHOICE_AUTO ? UNIT_CHOICE_AUTO : normalizeUnitCode(rawChoice)
    setSelectedUnitChoice(nextChoice)
    if (nextChoice !== UNIT_CHOICE_AUTO) {
      setDetectedUnitCode(null)
    }
    if (user && conversationId) {
      void syncConversationContext(conversationId, nextChoice, mode, null)
    }
    setShowContextPicker(false)
  }

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
      const nextConversations = payload.conversations || []
      setConversations(nextConversations)

      if (conversationId && !nextConversations.some((conversation) => conversation.id === conversationId)) {
        const replacement = nextConversations[0]
        setConversationId(replacement?.id || '')
        applyConversationUnitContext(replacement)
        if (!replacement) {
          setMessages([])
        }
        return
      }

      if (!conversationId && nextConversations[0]?.id) {
        const firstConversation = nextConversations[0]
        setConversationId(firstConversation.id)
        applyConversationUnitContext(firstConversation)
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

  async function syncConversationContext(nextConversationId: string, nextUnitChoice: string, nextMode: typeof mode, nextDetectedUnitCode?: string | null) {
    if (!user || !nextConversationId) return
    const nextSelectionMode = getUnitSelectionMode(nextUnitChoice)
    const nextManualUnit = getManualUnitCode(nextUnitChoice)
    await fetchJson(`/api/ai-tutor/conversations/${nextConversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitId: null,
        activeUnitCode: nextManualUnit,
        mode: nextMode,
        sourceScope: {
          unitSelectionMode: nextSelectionMode,
          selectedUnitCode: nextManualUnit,
          detectedUnitCode: normalizeUnitCode(nextDetectedUnitCode || '') || null
        }
      })
    })
  }

  async function createConversationWithCurrentContext() {
    const created = await fetchJson<{ ok: boolean; conversation: TutorConversation }>('/api/ai-tutor/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Tutor ${new Date().toLocaleDateString()}`,
        unitId: null,
        activeUnitCode: getManualUnitCode(selectedUnitChoice),
        sourceScope: {
          unitSelectionMode,
          selectedUnitCode: manualUnitCode,
          detectedUnitCode
        },
        mode
      })
    })

    setConversations((current) => [created.conversation, ...current.filter((conversation) => conversation.id !== created.conversation.id)])
    setConversationId(created.conversation.id)
    applyConversationUnitContext(created.conversation)
    return created.conversation.id
  }

  async function recoverConversationAfterSyncFailure(failedConversationId: string) {
    const payload = await fetchJson<{ ok: boolean; conversations: TutorConversation[] }>('/api/ai-tutor/conversations', { cache: 'no-store' })
    const available = payload.conversations || []
    setConversations(available)

    const exact = available.find((conversation) => conversation.id === failedConversationId)
    if (exact) {
      setConversationId(exact.id)
      applyConversationUnitContext(exact)
      return exact.id
    }

    return createConversationWithCurrentContext()
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

    applyConversationUnitContext(activeConversation)
    if (activeConversation.mode && activeConversation.mode !== mode) {
      setMode(activeConversation.mode as typeof mode)
    }
  }, [conversationId, conversations, mode])

  async function ensureConversation() {
    if (conversationId) return conversationId
    if (!user) {
      const guestConversationId = 'guest-default'
      setConversationId(guestConversationId)
      return guestConversationId
    }

    return createConversationWithCurrentContext()
  }

  async function sendMessage(regenerateFromUserMessage?: string) {
    const trimmed = (regenerateFromUserMessage || input).trim()
    if (!trimmed) return

    if (/\b(show me|write|solve|run).{0,30}\bin r\b|\bsee it in r\b|\br code\b/i.test(trimmed)) {
      setRLabOpen(true)
    }

    if (!user && requireAuth('Sign in to persist tutor memory, conversations and learning profile.')) {
      // Allow guests to continue in local mode after showing auth prompt.
    }

    setError('')
    setIsLoading(true)
    setDraftAssistant('')
    setActiveCitations([])

    try {
      let activeConversationId = await ensureConversation()
      if (user) {
        try {
          await syncConversationContext(activeConversationId, selectedUnitChoice, mode, detectedUnitCode)
        } catch (syncError: any) {
          if (syncError?.code === 'CONVERSATION_NOT_FOUND') {
            activeConversationId = await recoverConversationAfterSyncFailure(activeConversationId)
            await syncConversationContext(activeConversationId, selectedUnitChoice, mode, detectedUnitCode)
          } else {
            throw syncError
          }
        }
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
          unit: manualUnitCode || null,
          selectedUnitCode: manualUnitCode || null,
          unitSelectionMode,
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
            const nextDetected = normalizeUnitCode(eventPayload?.detectedUnitCode || '') || null
            setDetectedUnitCode(nextDetected)
            if (user) {
              void syncConversationContext(activeConversationId, selectedUnitChoice, mode, nextDetected)
            }
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

  const containerClass = focusMode
    ? 'fixed inset-0 z-50 bg-slate-50 p-3 sm:p-4'
    : 'relative'

  return (
    <div className={containerClass}>
      <div className="flex h-full min-h-[78vh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden"
              aria-label="Open conversations sidebar"
            >
              <PanelLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className="hidden rounded-xl border border-slate-200 p-2 text-slate-600 lg:inline-flex"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <PanelLeftClose size={16} className={sidebarCollapsed ? 'rotate-180' : ''} />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">AI Tutor Workspace</p>
              <p className="text-xs text-slate-500">Conversation-first study flow for actuarial learning.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWorkspace('tutor')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${workspace === 'tutor' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              MuksBooks Tutor
            </button>
            <button
              type="button"
              onClick={() => setWorkspace('claude')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${workspace === 'claude' ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Work with Claude
            </button>
            <button
              type="button"
              onClick={() => setFocusMode((open) => !open)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600"
              aria-label={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
            >
              {focusMode ? <Minimize2 size={16} /> : <Expand size={16} />}
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1">
          {sidebarOpen ? (
            <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          ) : null}

          <aside
            className={`
              fixed left-0 top-0 z-50 h-full w-[260px] border-r border-slate-200 bg-white p-3 transition-transform lg:static lg:z-0 lg:h-auto lg:translate-x-0
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              ${sidebarCollapsed ? 'lg:w-0 lg:overflow-hidden lg:border-r-0 lg:p-0' : ''}
            `}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Conversations</p>
              <button
                type="button"
                onClick={() => {
                  setConversationId('')
                  setSelectedUnitChoice(UNIT_CHOICE_GENERAL)
                  setDetectedUnitCode(null)
                  setMessages([])
                  setSidebarOpen(false)
                }}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-1 overflow-y-auto pb-4">
              {conversations.map((conversation) => (
                <div key={conversation.id} className={`rounded-2xl p-2 ${conversation.id === conversationId ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      setConversationId(conversation.id)
                      setSidebarOpen(false)
                    }}
                  >
                    <p className="truncate text-sm font-medium text-slate-900">{conversation.title}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{conversation.active_unit_code || 'General'}</p>
                  </button>
                  {user ? (
                    <div className="mt-2 flex gap-2 text-[11px]">
                      <button className="text-slate-500 hover:text-slate-800" onClick={() => renameConversation(conversation)}>Rename</button>
                      <button className="text-rose-600 hover:text-rose-700" onClick={() => deleteConversation(conversation)}>Delete</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </aside>

          <section className="min-w-0 flex-1">
            {workspace === 'claude' ? (
              <div className={`h-full p-3 sm:p-4 ${claudeExpanded ? 'pb-0' : ''}`}>
                <ClaudeWorkspace
                  artifactUrl={claudeArtifactUrl}
                  expanded={claudeExpanded}
                  onToggleExpanded={() => setClaudeExpanded((open) => !open)}
                />
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <div className="border-b border-slate-200 px-3 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowContextPicker((open) => !open)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        {contextChipLabel}
                        <ChevronDown size={12} />
                      </button>
                      {showContextPicker ? (
                        <div className="absolute left-0 top-9 z-20 w-[280px] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Study context</p>
                          <button className="block w-full rounded-xl px-2 py-2 text-left text-sm hover:bg-slate-50" onClick={() => applyUnitChoice(UNIT_CHOICE_GENERAL)}>General</button>
                          <button className="block w-full rounded-xl px-2 py-2 text-left text-sm hover:bg-slate-50" onClick={() => applyUnitChoice(UNIT_CHOICE_AUTO)}>Auto detect</button>
                          {unitOptions.map((option) => (
                            <button
                              key={option.code}
                              className="block w-full rounded-xl px-2 py-2 text-left text-sm hover:bg-slate-50"
                              onClick={() => applyUnitChoice(option.code)}
                            >
                              {option.code} - {option.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {topic ? <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">{topic}</span> : null}
                    {latestAssistantCitations.length ? <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">{latestAssistantCitations.length} sources</span> : null}

                    <button
                      type="button"
                      onClick={() => setShowContextDetails((open) => !open)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                    >
                      Details
                    </button>
                  </div>

                  {showContextDetails ? (
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      <p><strong className="text-slate-900">Conversation:</strong> {activeConversation?.title || 'New chat'}</p>
                      <p><strong className="text-slate-900">Context:</strong> {contextLabel}</p>
                      <p><strong className="text-slate-900">Mode:</strong> {mode}</p>
                      <p><strong className="text-slate-900">Learning memory:</strong> {learningProfile ? 'Active' : 'Not loaded'}</p>
                    </div>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
                  {!messages.length && !draftAssistant ? (
                    <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center text-center">
                      <p className="text-2xl font-semibold text-slate-900">What are we learning today?</p>
                      <p className="mt-2 text-sm text-slate-600">Pick a context and start a focused study conversation.</p>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <button className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700" onClick={() => applyUnitChoice(UNIT_CHOICE_GENERAL)}>General</button>
                        {unitOptions.slice(0, 2).map((option) => (
                          <button key={option.code} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700" onClick={() => applyUnitChoice(option.code)}>
                            {option.code}
                          </button>
                        ))}
                      </div>
                      <div className="mt-6 grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                        <p>Explain today&apos;s lecture</p>
                        <p>Quiz me</p>
                        <p>Work through a problem</p>
                        <p>See something in R</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mx-auto w-full max-w-4xl space-y-8">
                      {messages.map((message) => (
                        <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                          {message.role === 'user' ? (
                            <div className="max-w-[85%] rounded-3xl bg-slate-900 px-4 py-3 text-sm leading-7 text-white">
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              <div className="mt-2 flex gap-3 text-[11px] text-slate-200">
                                <button onClick={() => setInput(message.content)}>Edit</button>
                                <button onClick={() => void sendMessage(message.content)}>Retry</button>
                                <button onClick={() => { void copyToClipboard(message.content) }}>Copy</button>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full">
                              <div className="mb-2 flex flex-wrap gap-2 text-xs">
                                <button className="rounded-full border border-slate-200 px-3 py-1 text-slate-600" onClick={() => readAloud.speakText(message.content)}>Read aloud</button>
                                <button className="rounded-full border border-slate-200 px-3 py-1 text-slate-600" onClick={readAloud.readSelection}>Read selection</button>
                                <button className="rounded-full border border-slate-200 px-3 py-1 text-slate-600" onClick={() => { void copyToClipboard(message.content) }}>Copy</button>
                              </div>
                              <MarkdownMessage content={message.content} />
                              <SourceChip
                                citations={message.citations}
                                open={expandedSourcesMessageId === message.id}
                                onToggle={() => setExpandedSourcesMessageId((current) => current === message.id ? null : message.id)}
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      {isLoading ? (
                        <div className="w-full text-sm text-slate-500">
                          <p className="font-medium text-slate-800">Tutor is thinking...</p>
                          {draftAssistant ? (
                            <div className="mt-3">
                              <MarkdownMessage content={draftAssistant} />
                              <SourceChip
                                citations={activeCitations}
                                open={expandedSourcesMessageId === '__draft__'}
                                onToggle={() => setExpandedSourcesMessageId((current) => current === '__draft__' ? null : '__draft__')}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 bg-white px-3 py-3 sm:px-5">
                  {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}
                  {micStatus ? <p className="mb-2 text-xs text-slate-500" aria-live="polite">{micStatus}</p> : null}

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Ask anything about your unit, then follow up naturally..."
                      rows={4}
                      className="w-full resize-none border-0 bg-transparent px-1 text-sm leading-7 text-slate-900 outline-none"
                      disabled={isLoading}
                    />

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-slate-300">
                        <Paperclip size={13} />
                        Attachment
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
                        onClick={startDictation}
                        disabled={isLoading || isListening}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
                      >
                        <Mic size={13} />
                        {isListening ? 'Listening...' : 'Microphone'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowTools((open) => !open)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
                      >
                        <Wrench size={13} />
                        Tools
                      </button>

                      <button
                        type="button"
                        onClick={() => setRLabOpen((open) => !open)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
                      >
                        <FlaskConical size={13} />
                        {'</> See it in R'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setWorkspace('claude')}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
                      >
                        <Sparkles size={13} />
                        Open Claude workspace
                      </button>

                      <button
                        type="button"
                        onClick={() => void sendMessage()}
                        disabled={isLoading || !input.trim()}
                        className="ml-auto inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send size={14} />
                        Send
                      </button>
                    </div>

                    {showTools ? (
                      <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
                        <label className="text-xs text-slate-600">
                          Topic
                          <input
                            value={topic}
                            onChange={(event) => setTopic(event.target.value)}
                            placeholder="e.g. Week 3 MLE"
                            className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
                          />
                        </label>
                        <label className="text-xs text-slate-600">
                          Mode
                          <select
                            value={mode}
                            onChange={(event) => {
                              const nextMode = event.target.value as typeof mode
                              setMode(nextMode)
                              if (user && conversationId) {
                                void syncConversationContext(conversationId, selectedUnitChoice, nextMode, detectedUnitCode)
                              }
                            }}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
                          >
                            {modes.map((item) => (
                              <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                          </select>
                        </label>

                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-left text-xs text-slate-600"
                          onClick={() => setShowMemoryPanel((open) => !open)}
                        >
                          {showMemoryPanel ? 'Hide learning memory' : 'Learning memory'}
                        </button>

                        {showMemoryPanel ? (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                            <p>Depth: {learningProfile?.preferred_depth || 'balanced'}</p>
                            <p>Hint style: {learningProfile?.hint_style || 'progressive'}</p>
                            <p>Recent topics: {learningProfile?.recent_topics?.slice(0, 3).join(', ') || 'None yet'}</p>
                            {user ? (
                              <button className="mt-1 text-rose-600" onClick={resetLearningMemory}>Reset memory</button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <ComposerFileList
                      files={composerFiles}
                      onRemove={(name) => setComposerFiles((current) => current.filter((file) => file.name !== name))}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {rLabOpen ? (
            <div className="absolute right-0 top-0 z-30 h-full w-full border-l border-slate-200 bg-white sm:w-[420px]">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">R Lab</p>
                    <p className="text-xs text-slate-500">Run and iterate R code from Tutor prompts.</p>
                  </div>
                  <button type="button" onClick={() => setRLabOpen(false)} className="rounded-xl border border-slate-200 p-2 text-slate-600">
                    <X size={14} />
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  <textarea
                    value={rCode}
                    onChange={(event) => setRCode(event.target.value)}
                    rows={11}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-950 px-3 py-3 font-mono text-xs text-slate-100"
                    placeholder="# Write or paste R code here"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setRCode('')}>Reset</Button>
                    <Button onClick={() => void runRCode()} disabled={rRunning || !rCode.trim()}>{rRunning ? 'Running...' : 'Run'}</Button>
                    <Button variant="outline" onClick={() => { void copyToClipboard(rCode) }}>Copy code</Button>
                    <Button
                      variant="outline"
                      onClick={() => setInput((current) => `${current}${current ? '\n\n' : ''}Use this R output in your explanation:\n${rOutput?.stdout || '(no output yet)'}`)}
                    >
                      Send output to chat
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
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
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
