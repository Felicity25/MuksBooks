import { createEvent } from './service'

type AppEventType =
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_PROCESSED'
  | 'COURSE_CREATED'
  | 'COURSE_UPDATED'
  | 'ASSESSMENT_CREATED'
  | 'ASSESSMENT_UPDATED'
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'QUIZ_COMPLETED'
  | 'TOPIC_MASTERY_UPDATED'
  | 'STUDY_SESSION_COMPLETED'
  | 'MISCONCEPTION_DETECTED'
  | 'STUDY_PLAN_UPDATED'

export function publishEvent(eventType: AppEventType, payload: Record<string, unknown>) {
  createEvent(eventType, payload)
}
