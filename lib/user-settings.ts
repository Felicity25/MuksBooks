export type ThemePreference = 'light' | 'dark' | 'system'
export type TextSizePreference = 'small' | 'default' | 'large' | 'extra-large'
export type DensityPreference = 'compact' | 'comfortable' | 'spacious'
export type MotionPreference = 'normal' | 'reduced'
export type FontPreference = 'modern' | 'readable' | 'academic'
export type ProactivityLevel = 'quiet' | 'balanced' | 'proactive'
export type WidgetSize = 'small' | 'medium' | 'large' | 'wide'

export type WidgetId =
  | 'suggested-actions'
  | 'todays-classes'
  | 'planner'
  | 'assessments'
  | 'current-week'
  | 'semester-timeline'
  | 'units'
  | 'mastery-pulse'
  | 'quick-upload'
  | 'tutor'
  | 'distribution'
  | 'resources'
  | 'actuarial-news'
  | 'careers'
  | 'applications'
  | 'mass-pulse'
  | 'saved-resources'
  | 'exemption-progress'
  | 'recent-uploads'
  | 'semester-progress'

export type HomepagePreset = 'academic-weapon' | 'study-focus' | 'career-focus' | 'minimal' | 'build-my-own'
export type QuickActionId = 'upload' | 'ask-tutor' | 'add-task' | 'careers' | 'todays-classes'

export interface WidgetLayoutItem {
  id: WidgetId
  size: WidgetSize
  settings?: Record<string, unknown>
}

export interface ProactivityControls {
  lecturePreparation: boolean
  tutorialPreparation: boolean
  workshopPreparation: boolean
  postClassReview: boolean
  assessmentPreparation: boolean
  catchUpTasks: boolean
  deepDives: boolean
  textbookResources: boolean
  professionalResources: boolean
  distributionOfTheDay: boolean
  internshipsJobs: boolean
  applicationActions: boolean
  careerEvents: boolean
  massEvents: boolean
  massProjects: boolean
  massCareers: boolean
  massAcademic: boolean
}

export interface UserSettings {
  theme: ThemePreference
  name: string
  degree: string
  targetMarks: string
  feedbackStrictness: 'lenient' | 'normal' | 'strict'
  pomodoroLength: number
  studyTimes: string
  timezone: string
  textSize: TextSizePreference
  density: DensityPreference
  motion: MotionPreference
  font: FontPreference
  homepagePreset: HomepagePreset
  homepageLayout: WidgetLayoutItem[]
  quickActions: QuickActionId[]
  proactivityLevel: ProactivityLevel
  proactivityControls: ProactivityControls
}

const layout = (items: Array<[WidgetId, WidgetSize]>): WidgetLayoutItem[] =>
  items.map(([id, size]) => ({ id, size }))

export const HOMEPAGE_PRESETS: Record<HomepagePreset, WidgetLayoutItem[]> = {
  'academic-weapon': layout([
    ['suggested-actions', 'large'],
    ['todays-classes', 'medium'],
    ['planner', 'large'],
    ['assessments', 'medium'],
    ['mastery-pulse', 'medium'],
    ['resources', 'medium']
  ]),
  'study-focus': layout([
    ['current-week', 'medium'],
    ['units', 'large'],
    ['tutor', 'medium'],
    ['resources', 'medium'],
    ['distribution', 'small'],
    ['planner', 'large']
  ]),
  'career-focus': layout([
    ['careers', 'large'],
    ['applications', 'medium'],
    ['mass-pulse', 'large'],
    ['actuarial-news', 'medium'],
    ['todays-classes', 'medium']
  ]),
  minimal: layout([
    ['todays-classes', 'medium'],
    ['suggested-actions', 'medium'],
    ['planner', 'medium']
  ]),
  'build-my-own': []
}

export const PROACTIVITY_DEFAULTS: Record<ProactivityLevel, ProactivityControls> = {
  quiet: {
    lecturePreparation: false,
    tutorialPreparation: false,
    workshopPreparation: false,
    postClassReview: false,
    assessmentPreparation: true,
    catchUpTasks: true,
    deepDives: false,
    textbookResources: false,
    professionalResources: false,
    distributionOfTheDay: false,
    internshipsJobs: false,
    applicationActions: true,
    careerEvents: false,
    massEvents: false,
    massProjects: false,
    massCareers: false,
    massAcademic: false
  },
  balanced: {
    lecturePreparation: true,
    tutorialPreparation: true,
    workshopPreparation: true,
    postClassReview: false,
    assessmentPreparation: true,
    catchUpTasks: true,
    deepDives: false,
    textbookResources: true,
    professionalResources: true,
    distributionOfTheDay: true,
    internshipsJobs: true,
    applicationActions: true,
    careerEvents: true,
    massEvents: true,
    massProjects: true,
    massCareers: true,
    massAcademic: true
  },
  proactive: {
    lecturePreparation: true,
    tutorialPreparation: true,
    workshopPreparation: true,
    postClassReview: true,
    assessmentPreparation: true,
    catchUpTasks: true,
    deepDives: true,
    textbookResources: true,
    professionalResources: true,
    distributionOfTheDay: true,
    internshipsJobs: true,
    applicationActions: true,
    careerEvents: true,
    massEvents: true,
    massProjects: true,
    massCareers: true,
    massAcademic: true
  }
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'system',
  name: '',
  degree: '',
  targetMarks: '',
  feedbackStrictness: 'normal',
  pomodoroLength: 25,
  studyTimes: '',
  timezone: 'Australia/Melbourne',
  textSize: 'default',
  density: 'comfortable',
  motion: 'normal',
  font: 'modern',
  homepagePreset: 'academic-weapon',
  homepageLayout: HOMEPAGE_PRESETS['academic-weapon'],
  quickActions: ['upload', 'ask-tutor', 'add-task'],
  proactivityLevel: 'balanced',
  proactivityControls: PROACTIVITY_DEFAULTS.balanced
}

export const GUEST_SETTINGS_KEY = 'muksbooks:user-settings:v2'

export function normalizeUserSettings(value?: Partial<UserSettings> | null): UserSettings {
  const level = value?.proactivityLevel || DEFAULT_USER_SETTINGS.proactivityLevel
  const preset = value?.homepagePreset || DEFAULT_USER_SETTINGS.homepagePreset
  const fallbackLayout = HOMEPAGE_PRESETS[preset]

  return {
    ...DEFAULT_USER_SETTINGS,
    ...value,
    homepageLayout: Array.isArray(value?.homepageLayout) ? value.homepageLayout : fallbackLayout,
    quickActions: Array.isArray(value?.quickActions) ? value.quickActions : DEFAULT_USER_SETTINGS.quickActions,
    proactivityControls: {
      ...PROACTIVITY_DEFAULTS[level],
      ...(value?.proactivityControls || {})
    }
  }
}