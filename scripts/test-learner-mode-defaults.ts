import { normalizeUserSettings } from '../lib/user-settings'

const learner = normalizeUserSettings({
  academicMode: 'LEARNER',
  homepagePreset: 'career-focus',
  homepageLayout: [
    { id: 'careers', size: 'large' },
    { id: 'actuarial-news', size: 'medium' },
    { id: 'planner', size: 'large' }
  ]
})

if (learner.homepagePreset === 'career-focus') {
  throw new Error('Learner presets must not retain the university career layout.')
}

if (learner.homepageLayout.some((item) => item.id === 'actuarial-news')) {
  throw new Error('Learner layout must not include actuarial news widgets.')
}

if (!learner.quickActions.includes('ask-tutor') || !learner.quickActions.includes('add-task')) {
  throw new Error('Learner quick actions must stay study-focused.')
}

console.log('learner defaults ok')
