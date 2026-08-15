import { Card } from '@/components/ui/card'
import { SectionShell } from '@/components/section-shell'

const quizTypes = ['Active recall', 'Calculation', 'Interpretation', 'Coding', 'Exam-style', 'Higher-order']

export default function QuizRoomPage() {
  return (
    <SectionShell title="Quiz room" description="Practice unit topics with smart quizzes" actionLabel="Start quiz">
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Feature coming soon</p>
        <p className="text-sm leading-6 text-slate-600">The quiz room will provide interactive quizzes with different question types and track your progress. This feature is under development.</p>
      </Card>
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Question types</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {quizTypes.map((type) => (
            <div key={type} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900">
              {type}
            </div>
          ))}
        </div>
      </Card>
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">After the quiz</p>
        <ul className="space-y-3 text-sm leading-6 text-slate-600">
          <li>Mastery score updates</li>
          <li>Mistakes added to the error log</li>
          <li>Suggested next study action</li>
        </ul>
      </Card>
    </SectionShell>
  )
}
