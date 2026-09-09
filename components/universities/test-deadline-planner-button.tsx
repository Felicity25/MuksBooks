'use client'

import { useState } from 'react'
import { CalendarPlus, Check } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'

interface TestDeadlinePlannerButtonProps {
  testName: string
  sessionLabel: string
  registrationDeadline: string
}

export function TestDeadlinePlannerButton({ testName, sessionLabel, registrationDeadline }: TestDeadlinePlannerButtonProps) {
  const { isGuest } = useAuth()
  const [state, setState] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE')

  const addToPlanner = async () => {
    if (isGuest) {
      setState('ERROR')
      return
    }
    setState('SAVING')
    const response = await fetch('/api/app-state/planner-tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: `Register for ${testName}`,
        description: `Admissions test registration deadline: ${sessionLabel}`,
        taskType: 'university_application',
        priority: 'high',
        plannedDate: registrationDeadline,
        dueDate: registrationDeadline,
        estimatedMinutes: 30,
        generatedBy: 'admissions-readiness'
      })
    })
    const result = await response.json().catch(() => ({}))
    setState(response.ok && result.taskId ? 'SAVED' : 'ERROR')
  }

  return <div className="mt-3">
    <Button type="button" size="sm" variant="secondary" onClick={() => void addToPlanner()} disabled={state === 'SAVING' || state === 'SAVED'}>
      {state === 'SAVED' ? <Check className="mr-2 h-4 w-4" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
      {state === 'SAVING' ? 'Adding...' : state === 'SAVED' ? 'Added to Planner' : 'Add deadline to Planner'}
    </Button>
    {state === 'ERROR' ? <p role="status" className="mt-2 text-xs text-slate-600">{isGuest ? 'Sign in to add this deadline to Planner.' : 'The deadline could not be added. Try again from Planner.'}</p> : null}
  </div>
}