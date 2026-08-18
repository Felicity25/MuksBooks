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
  theme: 'light',
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

const WIDGET_IDS: WidgetId[] = [
  'suggested-actions', 'todays-classes', 'planner', 'assessments', 'current-week',
  'semester-timeline', 'units', 'mastery-pulse', 'quick-upload', 'tutor',
  'distribution', 'resources', 'actuarial-news', 'careers', 'applications',
  'mass-pulse', 'saved-resources', 'exemption-progress', 'recent-uploads', 'semester-progress'
]
const WIDGET_SIZES: WidgetSize[] = ['small', 'medium', 'large', 'wide']
const QUICK_ACTION_IDS: QuickActionId[] = ['upload', 'ask-tutor', 'add-task', 'careers', 'todays-classes']
const PROACTIVITY_KEYS: Array<keyof ProactivityControls> = [
  'lecturePreparation', 'tutorialPreparation', 'workshopPreparation', 'postClassReview',
  'assessmentPreparation', 'catchUpTasks', 'deepDives', 'textbookResources',
  'professionalResources', 'distributionOfTheDay', 'internshipsJobs', 'applicationActions',
  'careerEvents', 'massEvents', 'massProjects', 'massCareers', 'massAcademic'
]

type SettingsParseResult =
  | { valid: true; data: Partial<UserSettings> }
  | { valid: false; error: string }

export function parseUserSettingsUpdate(value: unknown): SettingsParseResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { valid: false, error: 'Settings must be a JSON object.' }
  const update = value as Record<string, unknown>
  const enums: Record<string, readonly string[]> = {
    theme: ['light', 'dark', 'system'],
    textSize: ['small', 'default', 'large', 'extra-large'],
    density: ['compact', 'comfortable', 'spacious'],
    motion: ['normal', 'reduced'],
    font: ['modern', 'readable', 'academic'],
    feedbackStrictness: ['lenient', 'normal', 'strict'],
    proactivityLevel: ['quiet', 'balanced', 'proactive'],
    homepagePreset: ['academic-weapon', 'study-focus', 'career-focus', 'minimal', 'build-my-own']
  }

  for (const [field, allowed] of Object.entries(enums)) {
    if (field in update && !allowed.includes(update[field] as string)) return { valid: false, error: `Invalid ${field}.` }
  }
  for (const field of ['name', 'degree', 'targetMarks', 'studyTimes', 'timezone']) {
    if (field in update && typeof update[field] !== 'string') return { valid: false, error: `${field} must be a string.` }
  }
  if ('pomodoroLength' in update && (!Number.isInteger(update.pomodoroLength) || Number(update.pomodoroLength) < 5 || Number(update.pomodoroLength) > 90)) {
    return { valid: false, error: 'pomodoroLength must be an integer from 5 to 90.' }
  }
  if ('quickActions' in update) {
    if (!Array.isArray(update.quickActions) || update.quickActions.some((id) => !QUICK_ACTION_IDS.includes(id as QuickActionId))) return { valid: false, error: 'quickActions contains an invalid action.' }
    if (new Set(update.quickActions).size !== update.quickActions.length) return { valid: false, error: 'quickActions contains duplicates.' }
  }
  if ('homepageLayout' in update) {
    if (!Array.isArray(update.homepageLayout)) return { valid: false, error: 'homepageLayout must be an array.' }
    const seen = new Set<string>()
    for (const item of update.homepageLayout) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return { valid: false, error: 'Each homepage widget must be an object.' }
      const widget = item as Record<string, unknown>
      if (!WIDGET_IDS.includes(widget.id as WidgetId)) return { valid: false, error: 'homepageLayout contains an invalid widget.' }
      if (!WIDGET_SIZES.includes(widget.size as WidgetSize)) return { valid: false, error: 'homepageLayout contains an invalid size.' }
      if (seen.has(widget.id as string)) return { valid: false, error: 'homepageLayout contains duplicate widgets.' }
      if ('settings' in widget && (!widget.settings || typeof widget.settings !== 'object' || Array.isArray(widget.settings))) return { valid: false, error: 'Widget settings must be an object.' }
      seen.add(widget.id as string)
    }
  }
  if ('proactivityControls' in update) {
    if (!update.proactivityControls || typeof update.proactivityControls !== 'object' || Array.isArray(update.proactivityControls)) return { valid: false, error: 'proactivityControls must be an object.' }
    for (const [key, enabled] of Object.entries(update.proactivityControls)) {
      if (!PROACTIVITY_KEYS.includes(key as keyof ProactivityControls) || typeof enabled !== 'boolean') return { valid: false, error: 'proactivityControls contains an invalid value.' }
    }
  }
  return { valid: true, data: update as Partial<UserSettings> }
}

export function normalizeUserSettings(value?: Partial<UserSettings> | null): UserSettings {
  // Strip null/undefined keys first so a present-but-empty field (e.g. a brand-new user's
  // `theme: undefined`) never clobbers DEFAULT_USER_SETTINGS via object spread.
  const clean: Partial<UserSettings> = {}
  if (value) {
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined && val !== null) (clean as Record<string, unknown>)[key] = val
    }
  }

  const level = clean.proactivityLevel || DEFAULT_USER_SETTINGS.proactivityLevel
  const preset = clean.homepagePreset || DEFAULT_USER_SETTINGS.homepagePreset
  const fallbackLayout = HOMEPAGE_PRESETS[preset]

  return {
    ...DEFAULT_USER_SETTINGS,
    ...clean,
    homepageLayout: Array.isArray(clean.homepageLayout) ? clean.homepageLayout : fallbackLayout,
    quickActions: Array.isArray(clean.quickActions) ? clean.quickActions : DEFAULT_USER_SETTINGS.quickActions,
    proactivityControls: {
      ...PROACTIVITY_DEFAULTS[level],
      ...(clean.proactivityControls || {})
    }
  }
}