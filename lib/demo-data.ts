export const homeCards = [
  {
    label: 'Current semester',
    value: 'Semester 2 2026',
    hint: 'Monash teaching period dates are synced with your semester plan.',
    link: '/planner'
  },
  {
    label: 'Units active',
    value: '4 units',
    hint: 'ETC3430, ETC3460, BFF5926, ETC5512',
    link: '/units'
  },
  {
    label: 'Weak topics',
    value: 'Survival models, pricing models',
    hint: 'Focus exam recovery and weekly practice.',
    link: '/mastery'
  }
]

export const upcomingTasks = [
  {
    title: 'Review PML tutorial notes',
    due: 'Tomorrow 5pm',
    type: 'Study session',
    unit: 'ETC5512'
  },
  {
    title: 'Upload assignment brief',
    due: '2 days',
    type: 'Assignment',
    unit: 'BFF5926'
  },
  {
    title: 'Quiz: Actuarial exam verbs',
    due: 'This evening',
    type: 'Quiz',
    unit: 'ETC3430'
  }
]

export const units = [
  {
    code: 'ETC3430',
    name: 'Probability & Stochastic Processes',
    progress: 63,
    nextTopic: 'Markov chains'
  },
  {
    code: 'ETC3460',
    name: 'Statistical Inference for Actuaries',
    progress: 48,
    nextTopic: 'Hypothesis testing'
  },
  {
    code: 'BFF5926',
    name: 'Financial Modelling',
    progress: 54,
    nextTopic: 'Asset pricing models'
  }
]

export const uploads = [
  {
    title: 'Lecture 9 slides - survival analysis',
    category: 'Lecture slides',
    unit: 'ETC3430',
    date: 'Today'
  },
  {
    title: 'Assignment 2 rubric',
    category: 'Rubric',
    unit: 'BFF5926',
    date: 'Yesterday'
  }
]
