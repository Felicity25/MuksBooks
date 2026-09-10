import { SubjectResourceHub } from '@/components/learner/subject-resource-hub'

export default function SubjectResourcesPage({ params }: { params: { curriculumId: string; levelId: string; subjectId: string } }) {
  return <SubjectResourceHub {...params} />
}
