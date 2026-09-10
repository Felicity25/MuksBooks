import type { AcademicContainerRef } from '../academic-context.ts'
import type { CurriculumSubject } from './curriculum-registry.ts'
import type { ConfirmedSubjectTopic, LearnerProfile } from './store.ts'
import { CURRICULUM_RESOURCES, type LearnerCurriculumResource } from './curriculum-resources.ts'
import { activeLearnerSubjectContainers } from '../academic-context.ts'

export interface SubjectTopicProposal {
  id: string
  title: string
  officialTopicId?: string
  confidence: 'HIGH' | 'LOW'
  evidence: string
}

export interface ResourceContext {
  container: AcademicContainerRef
  confirmedTopics: ConfirmedSubjectTopic[]
  interests: string[]
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function proposeSubjectTopics(text: string, subject: CurriculumSubject): SubjectTopicProposal[] {
  const normalizedText = ` ${normalize(text)} `
  return subject.topics.flatMap((topic) => {
    const candidates = [topic.title, ...(topic.subtopics || [])].map(normalize).filter((value) => value.length >= 4)
    const matched = candidates.find((candidate) => normalizedText.includes(` ${candidate} `))
    if (!matched) return []
    return [{
      id: `proposal-${topic.id}`,
      title: topic.title,
      officialTopicId: topic.id,
      confidence: matched === normalize(topic.title) ? 'HIGH' as const : 'LOW' as const,
      evidence: matched
    }]
  })
}

export function proposeUnmappedTopicHeadings(text: string): SubjectTopicProposal[] {
  const seen = new Set<string>()
  return text.split(/\r?\n/).flatMap((line, index) => {
    const match = line.trim().match(/^(?:topic|unit|module)\s*\d*\s*[:\-–]\s*(.{4,80})$/i)
    const title = match?.[1]?.trim()
    const key = title ? normalize(title) : ''
    if (!title || seen.has(key)) return []
    seen.add(key)
    return [{ id: `heading-${index}-${key.replace(/\s+/g, '-')}`, title, confidence: 'LOW' as const, evidence: line.trim() }]
  }).slice(0, 20)
}

export function buildLearnerResourceContexts(profile: LearnerProfile, interests: string[] = []): ResourceContext[] {
  return activeLearnerSubjectContainers(profile).map((container) => {
    const subject = profile.subjects.find((item) => item.id === container.id)
    return {
      container,
      confirmedTopics: subject?.confirmedTopics || [],
      interests: interests.map(String).filter(Boolean)
    }
  })
}

function subjectMatches(resource: LearnerCurriculumResource, context: ResourceContext) {
  if (context.container.kind !== 'SUBJECT') return false
  const container = context.container
  const subjectCode = container.curriculumSubjectCode
  const exactAlignment = resource.alignments.some((alignment) => alignment.curriculumId === container.curriculumId &&
    (!alignment.levelIds?.length || !container.levelId || alignment.levelIds.includes(container.levelId)) &&
    Boolean(subjectCode && alignment.subjectIds?.includes(subjectCode)))
  if (exactAlignment) return true
  const broadCurriculumAlignment = resource.alignments.some((alignment) => alignment.curriculumId === container.curriculumId &&
    (!alignment.levelIds?.length || !container.levelId || alignment.levelIds.includes(container.levelId)) &&
    !alignment.subjectIds?.length)
  if (broadCurriculumAlignment) return true
  const subjectName = normalize(container.label)
  return !resource.alignments.length && resource.subjectKeywords.some((keyword) => {
    const normalizedKeyword = normalize(keyword)
    return subjectName.includes(normalizedKeyword) || normalizedKeyword.includes(subjectName)
  })
}

export function scoreResourceForContext(resource: LearnerCurriculumResource, context: ResourceContext) {
  if (context.container.kind !== 'SUBJECT' || !subjectMatches(resource, context)) return 0
  const container = context.container
  const subjectCode = container.curriculumSubjectCode
  const exactAlignment = resource.alignments.find((alignment) => alignment.curriculumId === container.curriculumId &&
    Boolean(subjectCode && alignment.subjectIds?.includes(subjectCode)))
  const broadCurriculumAlignment = resource.alignments.find((alignment) => alignment.curriculumId === container.curriculumId && !alignment.subjectIds?.length)
  let score = exactAlignment ? 400 : broadCurriculumAlignment ? 260 : 180
  if (exactAlignment?.levelIds?.includes(container.levelId || '')) score += 80

  const confirmedTerms = context.confirmedTopics.flatMap((topic) => [topic.title, topic.officialTopicId || '']).map(normalize)
  const topicTerms = resource.topicKeywords.map(normalize)
  const alignedTopicIds = resource.alignments.flatMap((alignment) => alignment.topicIds || []).map(normalize)
  if (confirmedTerms.some((term) => term && (topicTerms.includes(term) || alignedTopicIds.includes(term)))) score += 220

  const resourceText = normalize([resource.title, resource.summary, ...resource.subjectKeywords, ...resource.topicKeywords].join(' '))
  if (context.interests.some((interest) => resourceText.includes(normalize(interest)))) score += 20
  return score
}

export function personalisedResourcesForContext(context: ResourceContext) {
  return CURRICULUM_RESOURCES
    .filter((resource) => resource.isActive)
    .map((resource) => ({ resource, score: scoreResourceForContext(resource, context) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.resource.title.localeCompare(right.resource.title))
}