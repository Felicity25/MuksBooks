import { NextRequest, NextResponse } from 'next/server'
import { type AiTutorRequestBody } from '@/lib/ai-helper'
import { buildTutorPromptContext } from '@/lib/tutor/compose'
import { generateTutorReply } from '@/lib/tutor/provider'
import { createTutorMessage, isTutorUsageLimitExceeded, recordTutorUsage, upsertLearningProfile } from '@/lib/tutor/persistence'
import { deriveProfilePatch } from '@/lib/tutor/learning'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as (AiTutorRequestBody & { conversationId?: string }) | null
    if (!body?.message || typeof body.message !== 'string' || !body.message.trim()) {
      return NextResponse.json({ error: 'Message is required and must be a non-empty string' }, { status: 400 })
    }

    const user = await getAuthenticatedUser()
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({
        error: 'Sign in to use the paid Tutor AI. Guests can use the page, but AI generation requires authentication.',
        code: 'UNAUTHENTICATED'
      }, { status: 401 })
    }

    const exceeded = await isTutorUsageLimitExceeded(userId)
    if (exceeded) {
      return NextResponse.json({
        error: 'Daily Tutor usage limit reached. Please try again later or use your own provider credentials.',
        code: 'TUTOR_USAGE_LIMIT'
      }, { status: 429 })
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

    const modelReply = await generateTutorReply({
      systemPrompt: promptContext.systemPrompt,
      userPrompt: promptContext.userPrompt,
      userId
    })

    const responseText = modelReply?.text?.trim()
    if (!responseText) {
      throw new Error('The configured AI provider returned an empty Tutor response.')
    }

    if (userId && body.conversationId) {
      await createTutorMessage({
        userId,
        conversationId: body.conversationId,
        role: 'assistant',
        content: responseText,
        citations: promptContext.citations,
        metadata: {
          provider: modelReply?.provider || 'demo',
          model: modelReply?.model || 'offline',
          unitSelectionMode: promptContext.unitSelectionMode,
          selectedUnitCode: promptContext.selectedUnitCode,
          detectedUnitCode: promptContext.detectedUnitCode,
          effectiveUnitCode: promptContext.effectiveUnitCode,
          mode: body.mode || null,
          topic: body.topic || null
        }
      })

      if (modelReply?.usage) {
        await recordTutorUsage({
          userId,
          conversationId: body.conversationId,
          usage: modelReply.usage,
          route: 'sync'
        })
      }

      if (promptContext.learningProfile) {
        const patch = deriveProfilePatch({
          profile: promptContext.learningProfile,
          userMessage: body.message,
          assistantMessage: responseText,
          topic: body.topic
        })
        await upsertLearningProfile(userId, patch)
      }
    }

    return NextResponse.json({
      response: responseText,
      demoMode: false,
      citations: promptContext.citations,
      unitSelectionMode: promptContext.unitSelectionMode,
      selectedUnitCode: promptContext.selectedUnitCode,
      detectedUnitCode: promptContext.detectedUnitCode,
      effectiveUnitCode: promptContext.effectiveUnitCode,
      provider: modelReply?.provider || 'demo',
      model: modelReply?.model || 'offline'
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error occurred',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}
