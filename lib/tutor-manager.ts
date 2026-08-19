import type { AiTutorRequestBody } from './ai-helper'

export interface TutorManagerInput {
  rawQuestion: string
  selectedUnit?: string
  selectedTopic?: string
  selectedMode?: string
  contextData?: Partial<AiTutorRequestBody>
}

export interface TutorManagerOutput {
  refinedQuestion: string
  context: string
  unitFrame: string
  instructions: string
  detectedUnit?: string
  detectedTopic?: string
  detectedTaskType?: string
  retrievedContext?: any
  publicUnitInfo?: any
}

/**
 * TutorManager: AI tutor optimisation middleware for MuksBooks
 * Intercepts raw student questions and transforms them into structured prompts
 */
export class TutorManager {
  private static readonly TASK_TYPES = {
    explain: ['explain', 'what is', 'how does', 'describe', 'understand'],
    quiz: ['quiz', 'test', 'question', 'practice', 'exam'],
    mark: ['mark', 'grade', 'review', 'feedback', 'assignment', 'assess'],
    diagnosis: ['diagnose', 'weak', 'strong', 'performance', 'assessment'],
    plan: ['plan', 'schedule', 'study', 'revise', 'prepare'],
    lesson: ['lesson', 'teach', 'learn', 'tutorial', 'guide']
  }

  /**
   * Main processing function that transforms raw input into optimized prompt
   */
  static async processInput(input: TutorManagerInput): Promise<TutorManagerOutput> {
    console.log('[TutorManager] Processing input:', input.rawQuestion.substring(0, 100) + '...')

    // Detect unit, topic, and task type
    const detectedUnit = this.detectUnit(input.rawQuestion, input.selectedUnit, input.contextData)
    const detectedTopic = this.detectTopic(input.rawQuestion, detectedUnit, input.selectedTopic)
    const detectedTaskType = this.detectTaskType(input.rawQuestion, input.selectedMode)

    console.log('[TutorManager] Detected:', { detectedUnit, detectedTopic, detectedTaskType })

    // Retrieve relevant context from provided data
    const retrievedContext = await this.retrieveContext(detectedUnit, detectedTopic, input.contextData)

    // Optionally retrieve public unit information
    const publicUnitInfo = await this.retrievePublicUnitInfo(detectedUnit)

    // Build structured components
    const refinedQuestion = this.buildRefinedQuestion(input.rawQuestion, detectedUnit, detectedTopic, detectedTaskType)
    const context = this.buildContext(retrievedContext, publicUnitInfo)
    const unitFrame = this.buildUnitFrame(detectedUnit, detectedTopic, detectedTaskType)
    const instructions = this.buildInstructions(detectedTaskType)

    const output: TutorManagerOutput = {
      refinedQuestion,
      context,
      unitFrame,
      instructions,
      detectedUnit,
      detectedTopic,
      detectedTaskType,
      retrievedContext,
      publicUnitInfo
    }

    console.log('[TutorManager] Output generated:', {
      refinedQuestion: output.refinedQuestion.substring(0, 100) + '...',
      contextLength: output.context.length,
      unitFrameLength: output.unitFrame.length,
      instructionsLength: output.instructions.length
    })

    return output
  }

  /**
   * Detect unit from question text or use selected unit
   */
  private static detectUnit(question: string, selectedUnit?: string, contextData?: Partial<AiTutorRequestBody>): string | undefined {
    const normalize = (value?: string) => value?.toUpperCase().replace(/\s+/g, '')
    const availableUnits = (contextData?.availableUnits || [])
      .map((unit) => normalize(unit))
      .filter((unit): unit is string => Boolean(unit))

    const normalizedSelected = normalize(selectedUnit)
    if (normalizedSelected && (!availableUnits.length || availableUnits.includes(normalizedSelected))) {
      return normalizedSelected
    }

    const questionLower = question.toLowerCase()
    for (const unit of availableUnits) {
      if (questionLower.includes(unit.toLowerCase())) {
        return unit
      }
    }

    const unitMatch = contextData?.unitContext?.match(/Selected unit:\s*([A-Za-z0-9]+)/i)
    if (unitMatch?.[1]) {
      const parsedUnit = normalize(unitMatch[1])
      if (parsedUnit && (!availableUnits.length || availableUnits.includes(parsedUnit))) {
        return parsedUnit
      }
    }

    return undefined
  }

  /**
   * Detect topic from question text or use selected topic
   */
  private static detectTopic(question: string, unit?: string, selectedTopic?: string): string | undefined {
    if (selectedTopic) {
      return selectedTopic
    }

    // Simple keyword extraction - in production, this could use NLP
    const questionLower = question.toLowerCase()

    // Common actuarial topics
    const topics = [
      'time series', 'forecasting', 'arima', 'garch', 'volatility',
      'survival analysis', 'life tables', 'mortality', 'annuities',
      'asset pricing', 'portfolio theory', 'capm', 'options', 'derivatives',
      'markov chains', 'stochastic processes', 'poisson', 'brownian motion',
      'regression', 'hypothesis testing', 'confidence intervals'
    ]

    for (const topic of topics) {
      if (questionLower.includes(topic)) {
        return topic
      }
    }

    return undefined
  }

  /**
   * Detect task type from question text or use selected mode
   */
  private static detectTaskType(question: string, selectedMode?: string): string {
    if (selectedMode && selectedMode in this.TASK_TYPES) {
      return selectedMode
    }

    const questionLower = question.toLowerCase()

    for (const [taskType, keywords] of Object.entries(this.TASK_TYPES)) {
      if (keywords.some(keyword => questionLower.includes(keyword))) {
        return taskType
      }
    }

    return 'explain' // default
  }

  /**
   * Retrieve relevant context from provided context data
   */
  private static async retrieveContext(unit?: string, topic?: string, contextData?: Partial<AiTutorRequestBody>): Promise<any> {
    const context: {
      lectureNotes: string[]
      definitions: string[]
      assumptions: string[]
      formulas: string[]
      examples: string[]
      uploadedContent: string
      relevantChunks: string[]
      contextSummary: string
    } = {
      lectureNotes: [],
      definitions: [],
      assumptions: [],
      formulas: [],
      examples: [],
      uploadedContent: contextData?.uploadedContext || '',
      relevantChunks: contextData?.relevantChunks || [],
      contextSummary: contextData?.contextSummary || ''
    }

    if (contextData?.unitContext) {
      context.assumptions.push(`Curriculum scope: ${contextData.unitContext}`)
    }

    // Extract from relevant chunks
    if (contextData?.relevantChunks) {
      contextData.relevantChunks.forEach(chunk => {
        if (chunk.toLowerCase().includes('definition')) {
          context.definitions.push(chunk)
        } else if (chunk.toLowerCase().includes('formula') || chunk.includes('=')) {
          context.formulas.push(chunk)
        } else if (chunk.toLowerCase().includes('assume')) {
          context.assumptions.push(chunk)
        }
      })
    }

    if (!contextData?.relevantChunks?.length && contextData?.uploadedContext) {
      context.assumptions.push(`Uploaded resource summary: ${contextData.uploadedContext}`)
    }

    return context
  }

  /**
   * Retrieve public unit information from Monash pages
   */
  private static async retrievePublicUnitInfo(unit?: string): Promise<any> {
    if (!unit) return null

    try {
      const url = `https://handbook.monash.edu/2024/units/${unit}`
      return {
        overview: `Unit overview for ${unit}`,
        unitUrl: url,
        learningOutcomes: ['Outcome 1', 'Outcome 2'],
        assessment: ['Assignment 40%', 'Exam 60%']
      }
    } catch (error) {
      console.error('[TutorManager] Error retrieving public unit info:', error)
      return null
    }
  }

  /**
   * Build refined question
   */
  private static buildRefinedQuestion(rawQuestion: string, unit?: string, topic?: string, taskType?: string): string {
    let refined = rawQuestion

    // Add unit context if detected
    if (unit && !rawQuestion.toLowerCase().includes(unit.toLowerCase())) {
      refined = `Regarding ${unit}: ${rawQuestion}`
    }

    // Add topic context if detected
    if (topic && !rawQuestion.toLowerCase().includes(topic.toLowerCase())) {
      refined = `About ${topic} in ${unit || 'actuarial science'}: ${rawQuestion}`
    }

    // Add task type clarification
    if (taskType && taskType !== 'explain') {
      refined = `${taskType.charAt(0).toUpperCase() + taskType.slice(1)} request: ${refined}`
    }

    return refined
  }

  /**
   * Build context section
   */
  private static buildContext(retrievedContext: any, publicUnitInfo?: any): string {
    const sections = []

    if (retrievedContext?.definitions?.length) {
      sections.push(`Definitions:\n${retrievedContext.definitions.join('\n')}`)
    }

    if (retrievedContext?.assumptions?.length) {
      sections.push(`Key assumptions:\n${retrievedContext.assumptions.join('\n')}`)
    }

    if (retrievedContext?.formulas?.length) {
      sections.push(`Relevant formulas:\n${retrievedContext.formulas.join('\n')}`)
    }

    if (publicUnitInfo) {
      sections.push(`Unit information:\n${publicUnitInfo.overview || 'Unit overview not available'}`)
    }

    return sections.length ? sections.join('\n\n') : 'No specific context available - use general actuarial knowledge'
  }

  /**
   * Build unit frame section
   */
  private static buildUnitFrame(unit?: string, topic?: string, taskType?: string): string {
    const frame = []

    if (unit) {
      frame.push(`Unit: ${unit}`)
    }

    if (topic) {
      frame.push(`Topic: ${topic}`)
      frame.push(`Why it matters: This topic is fundamental to actuarial practice and appears in professional exams`)
    }

    if (taskType) {
      const assessmentMap = {
        explain: 'Understanding and application in assignments and exams',
        quiz: 'Practice questions and exam preparation',
        mark: 'Assignment assessment and rubric alignment',
        diagnosis: 'Performance analysis and study planning',
        plan: 'Study scheduling and revision planning',
        lesson: 'Structured learning and concept mastery'
      }
      frame.push(`Assessment context: ${assessmentMap[taskType as keyof typeof assessmentMap] || 'General learning'}`)
    }

    return frame.join('\n')
  }

  /**
   * Build instructions for AI Tutor
   */
  private static buildInstructions(taskType: string): string {
    const baseInstructions = [
      'explain step-by-step',
      'focus on intuition first, then maths',
      'highlight common mistakes',
      'link to applications',
      'match Monash actuarial level'
    ]

    const taskSpecificInstructions = {
      explain: [
        'provide clear definitions and examples',
        'connect to real-world actuarial applications',
        'explain mathematical derivations intuitively'
      ],
      quiz: [
        'create practice questions with solutions',
        'include exam-style problems',
        'provide marking guidance'
      ],
      mark: [
        'use HD-level criteria',
        'provide constructive feedback',
        'suggest specific improvements'
      ],
      diagnosis: [
        'analyze current understanding',
        'identify knowledge gaps',
        'recommend targeted practice'
      ],
      plan: [
        'create realistic study schedules',
        'prioritize based on assessment deadlines',
        'include active recall and practice testing'
      ],
      lesson: [
        'structure as complete lesson with prerequisites',
        'include worked examples',
        'end with practice questions and active recall'
      ]
    }

    const specific = taskSpecificInstructions[taskType as keyof typeof taskSpecificInstructions] || []

    return [...baseInstructions, ...specific].join('\n- ')
  }
}

/**
 * Convenience function to process input
 */
export async function optimizeTutorPrompt(input: TutorManagerInput): Promise<TutorManagerOutput> {
  return TutorManager.processInput(input)
}