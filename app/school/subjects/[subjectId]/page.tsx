import { SubjectDetailWorkspace } from '@/components/learner/subject-detail-workspace'

export default function SubjectDetailPage({ params }: { params: { subjectId: string } }) {
  return <SubjectDetailWorkspace subjectId={params.subjectId} />
}