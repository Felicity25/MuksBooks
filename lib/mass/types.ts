export type MassCategory = 'Events' | 'MASS Projects' | 'Careers' | 'Education' | 'Community'

export interface MassSourceDefinition {
  id: string
  name: string
  url: string
  type: 'website' | 'linktree' | 'club-directory'
}

export interface MassCandidate {
  externalId: string
  title: string
  url: string
  sourceId: string
  sourceName: string
  sourceUrl: string
  sourceType: string
  contentHash: string
  category: MassCategory
  description: string
  startsAt?: string | null
  endsAt?: string | null
  registrationDeadline?: string | null
  location?: string | null
  organisation: string
  relevantAreas: string[]
  isMassProjects: boolean
  whyRelevant: string
}

export interface MassPulseItem extends MassCandidate {
  id: string
  firstSeenAt: string
  lastSeenAt: string
  retrievedAt: string
  publishedAt?: string | null
  sources: Array<{ name: string; url: string }>
}