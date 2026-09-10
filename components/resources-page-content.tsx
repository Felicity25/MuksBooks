'use client'

import { useAuth } from '@/components/auth-provider'
import { LearnerResourcesWorkspace } from '@/components/learner/learner-resources-workspace'
import { ResourcesManager } from '@/components/resources-manager'

export function ResourcesPageContent() {
  const { settings } = useAuth()
  return settings.academicMode === 'LEARNER' ? <LearnerResourcesWorkspace /> : <ResourcesManager />
}
