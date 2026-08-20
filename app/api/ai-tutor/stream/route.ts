import { NextRequest } from 'next/server'
import { buildTutorPromptContext, type TutorRequest } from '@/lib/tutor/compose'
import { createTutorMessage, isTutorUsageLimitExceeded, recordTutorUsage, upsertLearningProfile } from '@/lib/tutor/persistence'
import { deriveProfilePatch } from '@/lib/tutor/learning'
import { streamTutorReply } from '@/lib/tutor/provider'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function sseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as TutorRequest | null
  if (!body?.message || typeof body.message !== 'string') {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const user = await getAuthenticatedUser()
  const userId = user?.id

  if (!userId) {
    return new Response(JSON.stringify({
      error: 'Sign in to use the paid Tutor AI. Guests can use the page, but AI generation requires authentication.',
      code: 'UNAUTHENTICATED'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const exceeded = await isTutorUsageLimitExceeded(userId)
  if (exceeded) {
    return new Response(JSON.stringify({
      error: 'Daily Tutor usage limit reached. Please try again later or switch to your own provider credentials.',
      code: 'TUTOR_USAGE_LIMIT'
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const promptContext = await buildTutorPromptContext(body, userId)

  if (userId && body.conversationId) {
    await createTutorMessage({
      userId,
      conversationId: body.conversationId,
      role: 'user',
      content: body.message,
      metadata: {
        unit: body.unit || null,
        topic: body.topic || null,
        mode: body.mode || null
      }
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let fullText = ''
        const modelReply = await streamTutorReply({
          systemPrompt: promptContext.systemPrompt,
          userPrompt: promptContext.userPrompt,
          userId,
          onText: async (chunk) => {
            fullText += chunk
            controller.enqueue(encoder.encode(sseEvent('chunk', { text: chunk })))
          }
        })

        const provider = modelReply.provider
        const model = modelReply.model
        const usage = modelReply.usage

        const citations = promptContext.citations || []

        if (userId && body.conversationId) {
          await createTutorMessage({
            userId,
            conversationId: body.conversationId,
            role: 'assistant',
            content: fullText,
            citations,
            metadata: {
              provider,
              model,
              unitSelectionMode: promptContext.unitSelectionMode,
              selectedUnitCode: promptContext.selectedUnitCode,
              detectedUnitCode: promptContext.detectedUnitCode,
              effectiveUnitCode: promptContext.effectiveUnitCode,
              mode: body.mode || null,
              topic: body.topic || null
            }
          })

          if (usage) {
            await recordTutorUsage({
              userId,
              conversationId: body.conversationId,
              usage,
              route: 'stream'
            })
          }

          if (promptContext.learningProfile) {
            const patch = deriveProfilePatch({
              profile: promptContext.learningProfile,
              userMessage: body.message,
              assistantMessage: fullText,
              topic: body.topic
            })
            await upsertLearningProfile(userId, patch)
          }
        }

        controller.enqueue(encoder.encode(sseEvent('meta', {
          provider,
          model,
          citations,
          unitSelectionMode: promptContext.unitSelectionMode,
          selectedUnitCode: promptContext.selectedUnitCode,
          detectedUnitCode: promptContext.detectedUnitCode,
          effectiveUnitCode: promptContext.effectiveUnitCode,
          detectionConfidence: promptContext.detectionConfidence,
          done: true
        })))
        controller.enqueue(encoder.encode(sseEvent('done', { ok: true })))
        controller.close()
      } catch (error: any) {
        controller.enqueue(encoder.encode(sseEvent('error', { error: error?.message || 'Tutor stream failed' })))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  })
}
