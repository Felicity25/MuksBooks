'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function AssignmentReviewer() {
  const [assignmentText, setAssignmentText] = useState('')
  const [rubric, setRubric] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const generateFeedback = () => {
    if (!assignmentText.trim()) {
      setFeedback('Please enter your assignment text.')
      return
    }

    setIsLoading(true)

    // Simulate AI feedback generation
    setTimeout(() => {
      const mockFeedback = `
**Assignment Feedback**

**Strengths:**
- Clear structure and logical flow
- Good use of relevant examples
- Appropriate academic tone

**Areas for Improvement:**
- Deeper analysis needed in key sections
- More references to course materials
- Consider alternative perspectives

**Rubric Alignment:**
- Content (70%): 65/70 - Good coverage but lacks depth
- Structure (15%): 14/15 - Well organized
- Writing (15%): 13/15 - Clear but could be more concise

**Estimated Mark:** 75-80% (Credit/Distinction borderline)

**Priority Fixes for HD:**
1. Add more critical analysis and interpretation
2. Include counterarguments
3. Strengthen conclusion with broader implications
4. Ensure all rubric criteria are explicitly addressed

**Suggested Next Steps:**
- Revise with focus on depth over breadth
- Get peer feedback on analysis sections
- Review marking rubric again before submission
`

      setFeedback(mockFeedback)
      setIsLoading(false)
    }, 2000)
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Assignment submission</p>
        <div className="space-y-4">
          <textarea
            placeholder="Paste your assignment text here..."
            value={assignmentText}
            onChange={(e) => setAssignmentText(e.target.value)}
            className="min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={10}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700">Rubric (optional)</label>
            <textarea
              placeholder="Paste rubric or marking criteria..."
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={5}
            />
          </div>
          <Button onClick={generateFeedback} disabled={isLoading}>
            {isLoading ? 'Generating Feedback...' : 'Review Assignment'}
          </Button>
        </div>
      </Card>

      {feedback && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Feedback report</p>
          <div className="whitespace-pre-line text-sm text-slate-700">{feedback}</div>
        </Card>
      )}

      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Upload requirements</p>
        <p className="text-sm leading-6 text-slate-600">The reviewer uses assignment brief, rubric, Moodle instructions, marking guides and AI policy to score work.</p>
      </Card>
    </div>
  )
}