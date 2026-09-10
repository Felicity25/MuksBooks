import { SubjectResourceHub } from '@/components/learner/subject-resource-hub'

export default function TopicResourcesPage({ params }: { params: { curriculumId: string; levelId: string; subjectId: string; topicId: string } }) {
  return <SubjectResourceHub {...params} />
}
