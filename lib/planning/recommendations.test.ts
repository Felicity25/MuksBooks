import assert from 'node:assert/strict'
import type { PlanningContext } from './context'
import { generatePlannerRecommendations } from './recommendations'

const referenceDate = new Date('2026-08-17T00:00:00.000Z')
const baseContext: PlanningContext = {
  authenticated: true,
  generatedAt: referenceDate.toISOString(),
  currentWeek: { weekNumber: 5, label: 'Week 5', start: '2026-08-17', end: '2026-08-23', phase: 'teaching' },
  units: [{ id: 'unit-3420', code: 'ETC3420', name: 'Applied insurance methods', status: 'active', masteryLevel: 50 }],
  scheduleByUnit: {
    'unit-3420': [{ id: 'schedule-5', unitId: 'unit-3420', weekNumber: 5, startDate: null, endDate: null, topic: 'Collective Risk 2', additionalTopics: [], isBreak: false }]
  },
  calendarEvents: [{ id: 'tutorial-5', unitId: 'unit-3420', unitCode: 'ETC3420', title: 'ETC3420 Tutorial', activityType: 'Tutorial', isAssessment: false, startsAt: '2026-08-17T10:00:00.000Z', endsAt: '2026-08-17T11:00:00.000Z', location: 'Room 5', source: 'ical' }],
  academicUploads: [{ id: 'upload-5', documentId: 'document-5', filename: 'Tutorial 5 Questions.pdf', courseCode: 'ETC3420', unitId: 'unit-3420', resourceType: 'tutorial', documentType: 'PDF Note', week: 5, topic: 'Collective Risk 2', domain: 'academic' }],
  assessments: [],
  tasks: [],
  proactivityLevel: 'balanced',
  proactivityControls: {
    lecturePreparation: true,
    tutorialPreparation: true,
    workshopPreparation: true,
    postClassReview: true,
    assessmentPreparation: true,
    catchUpTasks: true,
    applicationActions: true,
    massEvents: true,
    massProjects: true,
    massCareers: true,
    massAcademic: true,
    deepDives: false,
    textbookResources: false,
    professionalResources: false,
    distributionOfTheDay: false,
    internshipsJobs: false,
    careerEvents: false
  }
}

const withUpload = generatePlannerRecommendations(baseContext, referenceDate)
const tutorial = withUpload.find((item) => item.kind === 'tutorial_prep')
assert.ok(tutorial)
assert.match(tutorial.title, /ETC3420 Tutorial: Collective Risk 2/)
assert.match(tutorial.detail, /Monday/)
assert.equal(tutorial.openDocumentId, 'document-5')
assert.ok(tutorial.sources.includes('Uploaded: Tutorial 5 Questions.pdf'))

const withoutUpload = generatePlannerRecommendations({ ...baseContext, academicUploads: [] }, referenceDate)
const noFileTutorial = withoutUpload.find((item) => item.kind === 'tutorial_prep')
assert.ok(noFileTutorial)
assert.equal(noFileTutorial.openDocumentId, null)
assert.ok(noFileTutorial.sources.includes('No matching uploaded material found yet.'))
assert.equal(noFileTutorial.sources.some((source) => source.includes('Tutorial 5 Questions.pdf')), false)

console.log('planning-recommendations: all assertions passed')