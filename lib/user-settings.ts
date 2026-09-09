import type { ThemeId } from '@/lib/design/themes'
import type { UniversityApplication } from '@/lib/universities/types'

export type ThemePreference = ThemeId | 'light' | 'dark' | 'system'
export type TextSizePreference = 'small' | 'default' | 'large' | 'extra-large'
export type DensityPreference = 'compact' | 'comfortable' | 'spacious'
export type MotionPreference = 'normal' | 'reduced'
export type FontPreference = 'modern' | 'readable' | 'academic'
export type ProactivityLevel = 'quiet' | 'balanced' | 'proactive'
export type WidgetSize = 'small' | 'medium' | 'large' | 'wide'
export type YearLevel = 'first-year' | 'second-year' | 'third-year' | 'fourth-year' | 'postgraduate' | 'other'

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
export type AcademicMode = 'UNIVERSITY' | 'LEARNER'
export type LearnerCurriculum = 'IB Diploma Programme' | 'Other'
export type LearnerYearLevel = 'DP1' | 'DP2' | 'Year 11' | 'Year 12' | 'Other'

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
  academicMode: AcademicMode
  curriculum: LearnerCurriculum
  schoolName: string
  schoolCountry: string
  schoolYear: LearnerYearLevel
  examSession: string
  theme: ThemePreference
  name: string
  institution: string
  degree: string
  fieldOfStudy: string
  major: string
  yearLevel: YearLevel
  careerInterests: string[]
  academicInterests: string[]
  universityShortlist: string[]
  universityCompare: string[]
  universityApplications: UniversityApplication[]
  targetMarks: string
  feedbackStrictness: 'lenient' | 'normal' | 'strict'
  pomodoroLength: number
  focusDurationMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  focusCycleCount: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  studyBellMuted: boolean
  studyBellVolume: number
  focusNotificationsEnabled: boolean
  speechRate: number
  speechVolume: number
  speechMuted: boolean
  speechVoiceURI: string
  mathSpeechDetail: 'brief' | 'detailed'
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

const UNIVERSITY_ONLY_WIDGETS = new Set<WidgetId>(['careers', 'applications', 'actuarial-news', 'mass-pulse', 'exemption-progress'])

export function getModeAwareHomepageLayout(academicMode: AcademicMode, layoutOverride?: WidgetLayoutItem[] | null): WidgetLayoutItem[] {
  const baseLayout = Array.isArray(layoutOverride) && layoutOverride.length ? layoutOverride : HOMEPAGE_PRESETS['academic-weapon']
  return academicMode === 'LEARNER'
    ? baseLayout.filter((item) => !UNIVERSITY_ONLY_WIDGETS.has(item.id))
    : baseLayout
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
  academicMode: 'UNIVERSITY',
  curriculum: 'IB Diploma Programme',
  schoolName: '',
  schoolCountry: '',
  schoolYear: 'DP1',
  examSession: '',
  theme: 'oxford',
  name: '',
  institution: '',
  degree: '',
  fieldOfStudy: '',
  major: '',
  yearLevel: 'other',
  careerInterests: [],
  academicInterests: [],
  universityShortlist: [],
  universityCompare: [],
  universityApplications: [],
  targetMarks: '',
  feedbackStrictness: 'normal',
  pomodoroLength: 25,
  focusDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 20,
  focusCycleCount: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  studyBellMuted: false,
  studyBellVolume: 0.6,
  focusNotificationsEnabled: false,
  speechRate: 1,
  speechVolume: 0.85,
  speechMuted: false,
  speechVoiceURI: '',
  mathSpeechDetail: 'brief',
  studyTimes: '',
  timezone: 'Australia/Melbourne',
  textSize: 'default',
  density: 'comfortable',
  motion: 'normal',
  font: 'academic',
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
    academicMode: ['UNIVERSITY', 'LEARNER'],
    curriculum: ['IB Diploma Programme', 'Other'],
    schoolYear: ['DP1', 'DP2', 'Year 11', 'Year 12', 'Other'],
    theme: ['muks-classic', 'scholar-blue', 'rose-espresso', 'sage-library', 'lavender-notes', 'oxford', 'matcha-study', 'midnight', 'golden-hour', 'cloud', 'light', 'dark', 'system'],
    textSize: ['small', 'default', 'large', 'extra-large'],
    density: ['compact', 'comfortable', 'spacious'],
    motion: ['normal', 'reduced'],
    font: ['modern', 'readable', 'academic'],
    feedbackStrictness: ['lenient', 'normal', 'strict'],
    proactivityLevel: ['quiet', 'balanced', 'proactive'],
    homepagePreset: ['academic-weapon', 'study-focus', 'career-focus', 'minimal', 'build-my-own'],
    yearLevel: ['first-year', 'second-year', 'third-year', 'fourth-year', 'postgraduate', 'other']
  }

  for (const [field, allowed] of Object.entries(enums)) {
    if (field in update && !allowed.includes(update[field] as string)) return { valid: false, error: `Invalid ${field}.` }
  }
  for (const field of ['academicMode', 'curriculum', 'schoolName', 'schoolCountry', 'schoolYear', 'examSession', 'name', 'institution', 'degree', 'fieldOfStudy', 'major', 'targetMarks', 'studyTimes', 'timezone']) {
    if (field in update && typeof update[field] !== 'string') return { valid: false, error: `${field} must be a string.` }
  }
    if ('careerInterests' in update) {
      if (!Array.isArray(update.careerInterests) || update.careerInterests.some((item) => typeof item !== 'string')) {
        return { valid: false, error: 'careerInterests must be a string array.' }
      }
    }
    if ('academicInterests' in update) {
      if (!Array.isArray(update.academicInterests) || update.academicInterests.some((item) => typeof item !== 'string')) {
        return { valid: false, error: 'academicInterests must be a string array.' }
      }
    }
    if ('universityShortlist' in update && (!Array.isArray(update.universityShortlist) || update.universityShortlist.some((item) => typeof item !== 'string'))) {
      return { valid: false, error: 'universityShortlist must be a string array.' }
    }
    if ('universityCompare' in update && (!Array.isArray(update.universityCompare) || update.universityCompare.some((item) => typeof item !== 'string'))) {
      return { valid: false, error: 'universityCompare must be a string array.' }
    }
    if ('universityApplications' in update && !Array.isArray(update.universityApplications)) {
      return { valid: false, error: 'universityApplications must be an array.' }
    }

  for (const field of ['speechVoiceURI']) {
    if (field in update && typeof update[field] !== 'string') return { valid: false, error: `${field} must be a string.` }
  }
  if ('pomodoroLength' in update && (!Number.isInteger(update.pomodoroLength) || Number(update.pomodoroLength) < 5 || Number(update.pomodoroLength) > 90)) {
    return { valid: false, error: 'pomodoroLength must be an integer from 5 to 90.' }
  }
  if ('focusDurationMinutes' in update && (!Number.isInteger(update.focusDurationMinutes) || Number(update.focusDurationMinutes) < 5 || Number(update.focusDurationMinutes) > 180)) {
    return { valid: false, error: 'focusDurationMinutes must be an integer from 5 to 180.' }
  }
  if ('shortBreakMinutes' in update && (!Number.isInteger(update.shortBreakMinutes) || Number(update.shortBreakMinutes) < 1 || Number(update.shortBreakMinutes) > 60)) {
    return { valid: false, error: 'shortBreakMinutes must be an integer from 1 to 60.' }
  }
  if ('longBreakMinutes' in update && (!Number.isInteger(update.longBreakMinutes) || Number(update.longBreakMinutes) < 1 || Number(update.longBreakMinutes) > 90)) {
    return { valid: false, error: 'longBreakMinutes must be an integer from 1 to 90.' }
  }
  if ('focusCycleCount' in update && (!Number.isInteger(update.focusCycleCount) || Number(update.focusCycleCount) < 1 || Number(update.focusCycleCount) > 12)) {
    return { valid: false, error: 'focusCycleCount must be an integer from 1 to 12.' }
  }
  if ('studyBellVolume' in update && (typeof update.studyBellVolume !== 'number' || Number(update.studyBellVolume) < 0 || Number(update.studyBellVolume) > 1)) {
    return { valid: false, error: 'studyBellVolume must be a number from 0 to 1.' }
  }
  if ('speechRate' in update && (typeof update.speechRate !== 'number' || Number(update.speechRate) < 0.5 || Number(update.speechRate) > 2)) {
    return { valid: false, error: 'speechRate must be a number from 0.5 to 2.' }
  }
  if ('speechVolume' in update && (typeof update.speechVolume !== 'number' || Number(update.speechVolume) < 0 || Number(update.speechVolume) > 1)) {
    return { valid: false, error: 'speechVolume must be a number from 0 to 1.' }
  }
  for (const field of ['autoStartBreaks', 'autoStartFocus', 'studyBellMuted', 'focusNotificationsEnabled', 'speechMuted']) {
    if (field in update && typeof update[field] !== 'boolean') return { valid: false, error: `${field} must be a boolean.` }
  }
  if ('mathSpeechDetail' in update && !['brief', 'detailed'].includes(update.mathSpeechDetail as string)) {
    return { valid: false, error: 'mathSpeechDetail must be brief or detailed.' }
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
  const hasSchoolProfile = Boolean(
    clean.schoolName?.trim() ||
    clean.schoolCountry?.trim() ||
    clean.curriculum?.trim() ||
    clean.schoolYear?.trim() ||
    clean.examSession?.trim()
  )
  const academicMode = clean.academicMode
    ? clean.academicMode
    : hasSchoolProfile
      ? 'LEARNER'
      : DEFAULT_USER_SETTINGS.academicMode

  const safeLayout = getModeAwareHomepageLayout(academicMode, Array.isArray(clean.homepageLayout) ? clean.homepageLayout : fallbackLayout)
  const safeQuickActions = Array.isArray(clean.quickActions)
    ? clean.quickActions.filter((action) => action !== 'careers')
    : DEFAULT_USER_SETTINGS.quickActions

  const normalizedControls = {
    ...PROACTIVITY_DEFAULTS[level],
    ...(clean.proactivityControls || {})
  }

  const proactivityControls = academicMode === 'LEARNER'
    ? {
      ...normalizedControls,
      internshipsJobs: false,
      applicationActions: false,
      careerEvents: false,
      massEvents: false,
      massProjects: false,
      massCareers: false,
      massAcademic: false
    }
    : normalizedControls

  return {
    ...DEFAULT_USER_SETTINGS,
    ...clean,
    academicMode,
    homepagePreset: academicMode === 'LEARNER' && clean.homepagePreset === 'career-focus' ? 'academic-weapon' : (clean.homepagePreset || DEFAULT_USER_SETTINGS.homepagePreset),
    homepageLayout: safeLayout.length ? safeLayout : getModeAwareHomepageLayout(academicMode, HOMEPAGE_PRESETS['academic-weapon']),
    quickActions: academicMode === 'LEARNER'
      ? safeQuickActions.filter((action) => ['upload', 'ask-tutor', 'add-task', 'todays-classes'].includes(action))
      : safeQuickActions,
    careerInterests: Array.isArray(clean.careerInterests)
      ? Array.from(new Set(clean.careerInterests.map((item) => `${item}`.trim()).filter(Boolean)))
      : DEFAULT_USER_SETTINGS.careerInterests,
    academicInterests: Array.isArray(clean.academicInterests)
      ? Array.from(new Set(clean.academicInterests.map((item) => `${item}`.trim()).filter(Boolean)))
      : DEFAULT_USER_SETTINGS.academicInterests,
    universityShortlist: Array.isArray(clean.universityShortlist)
      ? Array.from(new Set(clean.universityShortlist.map((item) => `${item}`.trim()).filter(Boolean)))
      : DEFAULT_USER_SETTINGS.universityShortlist,
    universityCompare: Array.isArray(clean.universityCompare)
      ? Array.from(new Set(clean.universityCompare.map((item) => `${item}`.trim()).filter(Boolean))).slice(0, 4)
      : DEFAULT_USER_SETTINGS.universityCompare,
    universityApplications: Array.isArray(clean.universityApplications)
      ? clean.universityApplications
      : DEFAULT_USER_SETTINGS.universityApplications,
    proactivityControls
  }
}