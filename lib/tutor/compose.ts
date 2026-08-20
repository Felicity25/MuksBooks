import { buildOptimizedPrompt, buildSystemPrompt, type AiTutorRequestBody } from '@/lib/ai-helper'
import { buildTutorRetrievalContext } from '@/lib/tutor-agent/service'
import { getLearningProfile, listTutorMessages } from '@/lib/tutor/persistence'
import { buildLearningHints } from '@/lib/tutor/learning'
import { appendLog } from '@/lib/logging'
import type { TutorCitation } from '@/lib/tutor/types'

export interface TutorRequest extends AiTutorRequestBody {
  conversationId?: string
  sourceScope?: 'unit' | 'selected' | 'single'
  selectedDocumentIds?: string[]
}

function compactConversation(messages: Array<{ role: string; content: string }>, limit = 8) {
  if (messages.length <= limit) return messages
  return messages.slice(-limit)
}

function prioritizeQuestion(input: TutorRequest) {
  return [
    input.message,
    input.topic ? `Requested topic: ${input.topic}` : '',
    input.unit ? `Selected unit: ${input.unit}` : '',
    input.mode ? `Requested mode: ${input.mode}` : ''
  ].filter(Boolean).join('\n')
}

export async function buildTutorPromptContext(input: TutorRequest, userId?: string) {
  const retrievalContext = await buildTutorRetrievalContext(input, userId)

  const conversationMessages = userId && input.conversationId
    ? await listTutorMessages(userId, input.conversationId)
    : []

  const compacted = compactConversation(conversationMessages.map((msg) => ({ role: msg.role, content: msg.content })))

  const learningProfile = userId
    ? await getLearningProfile(userId)
    : null

  const learningHints = learningProfile ? buildLearningHints(learningProfile) : ''

  const enrichedUnit = retrievalContext.effectiveUnitCode || null

  const enrichedBody: AiTutorRequestBody = {
    ...input,
    unit: enrichedUnit || undefined,
    unitSelectionMode: retrievalContext.unitSelectionMode,
    selectedUnitCode: retrievalContext.selectedUnitCode,
    detectedUnitCode: retrievalContext.detectedUnitCode,
    effectiveUnitCode: retrievalContext.effectiveUnitCode,
    availableUnits: retrievalContext.availableUnits,
    curriculumResourceSummary: retrievalContext.curriculumResourceSummary,
    relevantChunks: retrievalContext.relevantChunks,
    uploadedContext: retrievalContext.uploadedContext,
    unitContext: retrievalContext.unitContext,
    contextSummary: [
      `Current question:
${prioritizeQuestion(input)}`,
      input.contextSummary,
      `Unit mode: ${retrievalContext.unitSelectionMode}`,
      `Manual selected unit: ${retrievalContext.selectedUnitCode || 'none'}`,
      `Detected unit: ${retrievalContext.detectedUnitCode || 'none'} (confidence ${retrievalContext.detectionConfidence.toFixed(3)})`,
      `Effective unit: ${retrievalContext.effectiveUnitCode || 'General'}`,
      `Curriculum retrieval scope: ${retrievalContext.curriculumResourceSummary}`,
      retrievalContext.availableUnits.length
        ? `Active curriculum units: ${retrievalContext.availableUnits.join(', ')}`
        : 'No active curriculum units found in the Knowledge Base.',
      compacted.length
        ? `Recent conversation context (truncated):\n${compacted.map((item) => `${item.role.toUpperCase()}: ${item.content.slice(0, 180)}`).join('\n')}`
        : '',
      learningHints ? `Learning memory hints: ${learningHints}` : ''
    ].filter(Boolean).join(' ')
  }

  const systemPrompt = buildSystemPrompt({ unit: enrichedBody.unit, topic: input.topic, mode: input.mode, demoMode: false })
  const userPrompt = await buildOptimizedPrompt(enrichedBody)

  await appendLog('retrievals', 'Tutor prompt composed', {
    effectiveUnitCode: retrievalContext.effectiveUnitCode,
    unitSelectionMode: retrievalContext.unitSelectionMode,
    retrievalQuery: retrievalContext.retrievalQuery,
    scheduleContext: retrievalContext.scheduleContext,
    citations: retrievalContext.citations.map((citation) => citation.label).slice(0, 6),
    chunkPreview: retrievalContext.relevantChunks.slice(0, 3).map((chunk) => chunk.slice(0, 280)),
    systemPromptPreview: systemPrompt.slice(0, 280),
    userPromptPreview: userPrompt.slice(0, 500)
  }).catch(() => {})

  return {
    enrichedBody,
    systemPrompt,
    userPrompt,
    learningProfile,
    citations: retrievalContext.citations as TutorCitation[],
    unitSelectionMode: retrievalContext.unitSelectionMode,
    selectedUnitCode: retrievalContext.selectedUnitCode,
    detectedUnitCode: retrievalContext.detectedUnitCode,
    effectiveUnitCode: retrievalContext.effectiveUnitCode,
    detectionConfidence: retrievalContext.detectionConfidence
  }
}
