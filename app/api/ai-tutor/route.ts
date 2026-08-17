import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { AiTutorRequestBody, buildSystemPrompt, buildOptimizedPrompt, formatDemoResponse } from '@/lib/ai-helper'
import { buildTutorRetrievalContext } from '@/lib/tutor-agent/service'
import { getAuthenticatedUser } from '@/lib/supabase/server'

const provider = process.env.AI_PROVIDER || 'anthropic'
const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620'
const openaiApiKey = process.env.OPENAI_API_KEY
const anthropicApiKey = process.env.ANTHROPIC_API_KEY

console.log('[AI Tutor] Provider:', provider)
console.log('[AI Tutor] OpenAI API Key configured:', !!openaiApiKey)
console.log('[AI Tutor] Anthropic API Key configured:', !!anthropicApiKey)
console.log('[AI Tutor] OpenAI Model:', openaiModel)
console.log('[AI Tutor] Anthropic Model:', anthropicModel)

const openai = provider === 'openai' && openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null
const anthropic = provider === 'anthropic' && anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null

export async function POST(request: NextRequest) {
  try {
    console.log('[AI Tutor] Received request')

    // Validate request body
    let body: AiTutorRequestBody
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[AI Tutor] Invalid JSON in request body:', parseError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const { message, unit, topic, mode } = body

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.log('[AI Tutor] Missing or invalid message field')
      return NextResponse.json({ error: 'Message is required and must be a non-empty string' }, { status: 400 })
    }

    console.log('[AI Tutor] Processing request:', { unit, topic, mode, messageLength: message.length })

    // Retrieval-first architecture: always query Knowledge Base before generation
    const tutorUser = await getAuthenticatedUser()
    const retrievalContext = await buildTutorRetrievalContext(body, tutorUser?.id)
    const enrichedBody: AiTutorRequestBody = {
      ...body,
      unit: body.unit || retrievalContext.availableUnits[0],
      availableUnits: retrievalContext.availableUnits,
      curriculumResourceSummary: retrievalContext.curriculumResourceSummary,
      relevantChunks: retrievalContext.relevantChunks,
      uploadedContext: retrievalContext.uploadedContext,
      unitContext: retrievalContext.unitContext,
      contextSummary: [
        body.contextSummary,
        `Curriculum retrieval scope: ${retrievalContext.curriculumResourceSummary}`,
        retrievalContext.availableUnits.length
          ? `Active curriculum units: ${retrievalContext.availableUnits.join(', ')}`
          : 'No active curriculum units found in the Knowledge Base.'
      ].filter(Boolean).join(' ')
    }

    let response: string
    let demoMode = false

    if (anthropic) {
      try {
        console.log('[AI Tutor] Calling Anthropic API')
        const systemPrompt = buildSystemPrompt({ unit: enrichedBody.unit, topic, mode, demoMode: false })
        const userPrompt = await buildOptimizedPrompt(enrichedBody)

        const message = await anthropic.messages.create({
          model: anthropicModel,
          max_tokens: 1200,
          temperature: 0.2,
          messages: [
            { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
          ]
        })

        response = message.content?.[0]?.type === 'text' ? message.content[0].text?.trim() || '' : ''
        console.log('[AI Tutor] Anthropic response received, length:', response.length)

        if (!response) {
          console.log('[AI Tutor] Empty response from Anthropic, falling back to demo')
          response = formatDemoResponse(enrichedBody)
          demoMode = true
        }
      } catch (anthropicError: any) {
        console.error('[AI Tutor] Anthropic API error:', anthropicError.message || anthropicError)
        console.error('[AI Tutor] Anthropic error details:', JSON.stringify(anthropicError, null, 2))

        // Handle specific Anthropic errors
        if (anthropicError.status === 429) {
          return NextResponse.json({
            error: 'Anthropic API quota exceeded. Please check your Anthropic account billing.',
            demoMode: true
          }, { status: 429 })
        }

        if (anthropicError.status === 401) {
          return NextResponse.json({
            error: 'Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.',
            demoMode: true
          }, { status: 401 })
        }

        if (anthropicError.status === 400) {
          // Check for specific billing error
          if (anthropicError.error?.error?.message?.includes('credit balance is too low')) {
            return NextResponse.json({
              error: 'Anthropic API credits exhausted. Please add credits to your Anthropic account or switch to OpenAI.',
              demoMode: true
            }, { status: 402 }) // 402 Payment Required
          }
          return NextResponse.json({
            error: 'Invalid request to Anthropic API. Please check your request parameters.',
            demoMode: true
          }, { status: 400 })
        }

        // For other Anthropic errors, fall back to demo mode
        console.log('[AI Tutor] Falling back to demo mode due to Anthropic error')
        response = formatDemoResponse(enrichedBody)
        demoMode = true
      }
    } else if (openai) {
      try {
        console.log('[AI Tutor] Calling OpenAI API')
        const systemPrompt = buildSystemPrompt({ unit: enrichedBody.unit, topic, mode, demoMode: false })
        const userPrompt = await buildOptimizedPrompt(enrichedBody)

        const completion = await openai.chat.completions.create({
          model: openaiModel,
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1200
        })

        response = completion.choices?.[0]?.message?.content?.trim() || ''
        console.log('[AI Tutor] OpenAI response received, length:', response.length)

        if (!response) {
          console.log('[AI Tutor] Empty response from OpenAI, falling back to demo')
          response = formatDemoResponse(enrichedBody)
          demoMode = true
        }
      } catch (openaiError: any) {
        console.error('[AI Tutor] OpenAI API error:', openaiError.message || openaiError)

        // Handle specific OpenAI errors
        if (openaiError.status === 429) {
          return NextResponse.json({
            error: 'OpenAI API quota exceeded. Please check your OpenAI account billing.',
            demoMode: true
          }, { status: 429 })
        }

        if (openaiError.status === 401) {
          return NextResponse.json({
            error: 'Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.',
            demoMode: true
          }, { status: 401 })
        }

        if (openaiError.status === 400) {
          return NextResponse.json({
            error: 'Invalid request to OpenAI API. Please check your request parameters.',
            demoMode: true
          }, { status: 400 })
        }

        // For other OpenAI errors, fall back to demo mode
        console.log('[AI Tutor] Falling back to demo mode due to OpenAI error')
        response = formatDemoResponse(enrichedBody)
        demoMode = true
      }
    } else {
      console.log('[AI Tutor] No AI client available, using demo mode')
      demoMode = true
      response = formatDemoResponse(enrichedBody)
    }

    console.log('[AI Tutor] Returning response, demoMode:', demoMode)
    return NextResponse.json({ response, demoMode })

  } catch (error: any) {
    console.error('[AI Tutor] Unexpected server error:', error.message || error)
    return NextResponse.json({
      error: 'Internal server error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}