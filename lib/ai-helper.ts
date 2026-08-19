import { optimizeTutorPrompt, TutorManagerInput, TutorManagerOutput } from './tutor-manager'

export interface AiTutorRequestBody {
  message: string
  unit?: string
  unitSelectionMode?: 'general' | 'auto' | 'manual'
  selectedUnitCode?: string | null
  detectedUnitCode?: string | null
  effectiveUnitCode?: string | null
  topic?: string
  mode?: string
  lessonObjectives?: string
  contextSummary?: string
  unitContext?: string
  relevantChunks?: string[]
  uploadedContext?: string
  masterySummary?: string
  taskSummary?: string
  plannerSummary?: string
  settingsSummary?: string
  assignmentContext?: string
  availableUnits?: string[]
  curriculumResourceSummary?: string
}

export function buildSystemPrompt(options: { unit?: string; topic?: string; mode?: string; demoMode: boolean }) {
  const mode = options.mode || 'general'
  return `You are MuksBooks, a strict but supportive academic tutor for Monash University actuarial science students. You act as:
- a unit-aware lecturer
- a rubric-focused assignment marker
- an exam coach
- a study strategist
- a diagnostics analyst

Always use the available context provided by the student, including unit guides, uploaded notes, rubrics, assignments, mastery scores, planner history, tasks, and study preferences.
Answer the user's current question first. Do not drift to an older topic or a different subject merely because it appears in prior conversation or retrieved notes.
If the selected unit is relevant, use it to narrow retrieval and examples; if it conflicts with the user's explicit question, follow the user's question.
Ignore irrelevant retrieved context rather than forcing a connection.
Use only the currently uploaded curriculum resources as the source of truth.
Never use deprecated or previously configured subjects when newer uploaded resources are available.
If resources are missing, explicitly state what is unavailable and do not invent curriculum content.
If context exists, ground your answer in that source and cite each source used.
If you are uncertain, label the answer clearly as provisional and ask for the missing unit guide or document only after delivering a strong inferred answer.
Do not give shallow or generic answers when personalised context exists.
Never return an empty or incomplete response.
Always answer using inferred university-level knowledge when uploaded content is not available.
Always suggest next study actions, practice questions, revision steps, and useful uploads or materials.
Format the response in clean Markdown with short headings, bullet lists, and short paragraphs.
Write formulas in LaTeX, using inline math for short expressions and display math on its own line for worked equations.
Keep equations visually separated so they read like a polished study solution.

The student is asking in ${mode} mode for unit ${options.unit || 'General'} and topic ${options.topic || 'General'}. Prioritize the current question over any inferred unit connection.
Respond with a structured academic tutoring style, including:
- direct answer
- intuition
- formal explanation
- example
- common mistakes
- unit/topic connection
- what to do next
- 3 check questions
- active guidance or study actions
If mode is lesson, generate a structured lesson with overview, prerequisites, formal clarity, worked example, common mistakes, practice questions, and active recall prompts.
If mode is mark, include rubric alignment, marker expectations, missing elements, likely weaknesses, and HD improvements.
If mode is diagnosis, include current performance, weak topics, strong topics, blockers, and next study priorities.
Be supportive but demanding. Value HD-level clarity and depth.`
}

export function buildUserPrompt(request: AiTutorRequestBody) {
  const chunks = request.relevantChunks?.length ? request.relevantChunks.join('\n\n') : ''
  const contextBlocks = [
    request.unit ? `Active unit: ${request.unit}` : 'Active unit: General / No unit',
    request.availableUnits?.length ? `Current curriculum units:\n${request.availableUnits.join(', ')}` : '',
    request.curriculumResourceSummary ? `Current uploaded curriculum resources:\n${request.curriculumResourceSummary}` : '',
    request.contextSummary ? `Context summary:\n${request.contextSummary}` : '',
    request.unitContext ? `Unit and upload linkage:\n${request.unitContext}` : '',
    request.uploadedContext ? `Uploaded content summary:\n${request.uploadedContext}` : '',
    request.lessonObjectives ? `Lesson objectives:\n${request.lessonObjectives}` : '',
    request.masterySummary ? `Mastery summary:\n${request.masterySummary}` : '',
    request.taskSummary ? `Task summary:\n${request.taskSummary}` : '',
    request.plannerSummary ? `Planner summary:\n${request.plannerSummary}` : '',
    request.settingsSummary ? `Study preferences:\n${request.settingsSummary}` : '',
    request.assignmentContext ? `Assignment context:\n${request.assignmentContext}` : '',
    chunks ? `Relevant knowledge chunks:\n${chunks}` : ''
  ].filter(Boolean).join('\n\n')

  const fallback = `If the available context is limited, provide the best academic guidance you can and clearly state what information is missing. Label tentative content as provisional.`

  const answerStructure = `Answer structure:
- Direct answer
- Intuition
- Formal explanation
- Example
- Common mistakes
- How this connects to the unit/topic
- What to practise next
- 3 follow-up questions` +
    `
Use short headings and compact bullet points.
Separate display equations onto their own lines.` +
    (request.mode === 'lesson' ? `
- Lesson overview
- Why this matters
- Prerequisites
- Key concepts
- Formal definitions and formulas
- Worked example
- Common mistakes
- Practice questions
- Active recall prompts
- Suggested next revision action` : '') +
    (request.mode === 'mark' ? `
- Rubric alignment
- What the marker is likely looking for
- What is missing
- Likely weaknesses
- HD-level improvements
- Questions the student should answer before submission` : '') +
    (request.mode === 'plan' ? `
- Current diagnosis
- Priority topics
- Suggested tasks
- Time estimate
- Next study block
- What to revise later` : '') +
    (request.mode === 'diagnosis' ? `
- Current student diagnosis
- Weak topics
- Exam-ready topics
- Blockers
- What to study next
- Habit changes
- HD performance actions` : '')

  return `${request.message}

${contextBlocks}

${fallback}

${answerStructure}

If you use any source, list it at the end under "Sources used".`
}

export function formatDemoResponse(request: AiTutorRequestBody) {
  const unit = request.unit || 'this unit'
  const topic = request.topic || 'the chosen topic'
  const sourceNote = request.unitContext || request.contextSummary ? 'Based on your selected unit, linked uploads, and study data.' : 'No uploaded content available; using general actuarial guidance.'

  const sections = [
    'Title',
    `Short direct answer: I have used ${unit}-specific context and your study profile to provide tailored advice for ${topic}.`,
    '',
    'Section: Intuition',
    'The core idea is to connect the concept to the broader actuarial reasoning behind the problem rather than only memorising a formula.',
    '',
    'Section: Formal explanation',
    'Work through the definition, assumptions, and steps carefully. Link each step back to the question so your reasoning stays clear and defensible.',
    '',
    'Section: Example',
    'Use a simple worked example first, then extend it to the full problem to show how the method applies in practice.',
    '',
    'Section: Common mistakes',
    '- Ignoring assumptions',
    '- Using the wrong formula',
    '- Giving a shallow explanation without connecting it to the unit topic',
    '',
    'Section: What to do next',
    '- Review the relevant lecture notes',
    '- Practise one exam-style question',
    '- Check your answer against the rubric or learning outcome',
    request.curriculumResourceSummary ? `- Continue with the current uploaded curriculum set: ${request.curriculumResourceSummary}` : '- Upload current curriculum resources so responses can be strictly grounded.',
    request.unitContext ? `- Use the linked unit materials and uploads for ${unit}` : '- Add a unit guide or upload to personalise this further',
    '',
    `Sources used: ${sourceNote}`
  ]

  return sections.join('\n')
}

export async function buildOptimizedPrompt(request: AiTutorRequestBody): Promise<string> {
  // Use TutorManager to optimize the prompt
  const tutorInput: TutorManagerInput = {
    rawQuestion: request.message,
    selectedUnit: request.unit,
    selectedTopic: request.topic,
    selectedMode: request.mode,
    contextData: request // Pass the full request for context
  }

  const optimized = await optimizeTutorPrompt(tutorInput)

  // Build the final prompt using TutorManager's structured output
  const prompt = `[REFINED QUESTION]
${optimized.refinedQuestion}

[CONTEXT]
${optimized.context}

[UNIT FRAME]
${optimized.unitFrame}

[INSTRUCTIONS TO AI TUTOR]
- ${optimized.instructions}

Additional context from study materials:
${request.contextSummary || 'No additional context provided'}
${request.unitContext ? `\nUnit and upload linkage: ${request.unitContext}` : ''}
${request.uploadedContext ? `\nUploaded content: ${request.uploadedContext}` : ''}
${request.relevantChunks?.length ? `\nRelevant chunks: ${request.relevantChunks.join('\n')}` : ''}

Student profile:
${request.settingsSummary || 'No profile information'}
${request.masterySummary || 'No mastery data'}
${request.taskSummary || 'No task information'}
${request.plannerSummary || 'No planner data'}
${request.assignmentContext || 'No assignment context'}`

  return prompt
}