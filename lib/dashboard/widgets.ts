import type { WidgetId, WidgetSize } from '@/lib/user-settings'

export type WidgetCategory = 'Study' | 'Learning' | 'Career' | 'Progress'

export interface WidgetDefinition {
  id: WidgetId
  title: string
  description: string
  category: WidgetCategory
  sizes: WidgetSize[]
  defaultSize: WidgetSize
  refreshable?: boolean
}

export const WIDGETS: WidgetDefinition[] = [
  { id: 'suggested-actions', title: 'Suggested Actions', description: 'Ranked academic and opportunity recommendations.', category: 'Study', sizes: ['small', 'medium', 'large', 'wide'], defaultSize: 'large', refreshable: true },
  { id: 'planner', title: 'Weekly Planner', description: 'Tasks and study blocks that are coming up.', category: 'Study', sizes: ['medium', 'large', 'wide'], defaultSize: 'large' },
  { id: 'todays-classes', title: "Today's Classes", description: 'Confirmed classes and preparation.', category: 'Study', sizes: ['small', 'medium', 'large'], defaultSize: 'medium' },
  { id: 'current-week', title: 'This Week', description: 'Current teaching week and unit topics.', category: 'Study', sizes: ['small', 'medium', 'large'], defaultSize: 'medium' },
  { id: 'units', title: 'Units', description: 'Active units and current mastery.', category: 'Study', sizes: ['medium', 'large', 'wide'], defaultSize: 'large' },
  { id: 'mastery-pulse', title: 'Mastery Pulse', description: 'Strongest units and areas needing attention.', category: 'Study', sizes: ['small', 'medium', 'large'], defaultSize: 'medium' },
  { id: 'semester-timeline', title: 'Semester Timeline', description: 'Teaching weeks and key semester dates.', category: 'Study', sizes: ['medium', 'large', 'wide'], defaultSize: 'large' },
  { id: 'tutor', title: 'Tutor', description: 'Open a context-aware tutoring conversation.', category: 'Learning', sizes: ['small', 'medium'], defaultSize: 'medium' },
  { id: 'resources', title: 'Resources for You', description: 'Relevant learning resources and templates.', category: 'Learning', sizes: ['small', 'medium', 'large'], defaultSize: 'medium' },
  { id: 'distribution', title: 'Distribution of the Day', description: 'A compact daily probability concept.', category: 'Learning', sizes: ['small', 'medium'], defaultSize: 'small' },
  { id: 'quick-upload', title: 'Quick Upload', description: 'Add slides, briefs, and unit guides.', category: 'Learning', sizes: ['small', 'medium'], defaultSize: 'small' },
  { id: 'careers', title: 'Careers', description: 'Relevant roles and employer activity.', category: 'Career', sizes: ['small', 'medium', 'large'], defaultSize: 'large', refreshable: true },
  { id: 'applications', title: 'Applications', description: 'Application stages and urgent actions.', category: 'Career', sizes: ['small', 'medium', 'large'], defaultSize: 'medium' },
  { id: 'actuarial-news', title: 'Actuarial News', description: 'Cached industry headlines.', category: 'Career', sizes: ['small', 'medium', 'large', 'wide'], defaultSize: 'medium', refreshable: true },
  { id: 'mass-pulse', title: 'MASS Pulse', description: 'MASS events, projects, careers, and education.', category: 'Career', sizes: ['small', 'medium', 'large', 'wide'], defaultSize: 'large', refreshable: true },
  { id: 'assessments', title: 'Assessment Progress', description: 'Upcoming assessments and weighting.', category: 'Progress', sizes: ['small', 'medium', 'large'], defaultSize: 'medium' },
  { id: 'exemption-progress', title: 'Exemption Progress', description: 'Professional exemption progress.', category: 'Progress', sizes: ['small', 'medium'], defaultSize: 'medium' },
  { id: 'semester-progress', title: 'Semester Progress', description: 'Progress through the current semester.', category: 'Progress', sizes: ['small', 'medium', 'large'], defaultSize: 'medium' },
  { id: 'saved-resources', title: 'Saved Resources', description: 'Quick access to saved material.', category: 'Progress', sizes: ['small', 'medium'], defaultSize: 'medium' },
  { id: 'recent-uploads', title: 'Recent Uploads', description: 'Recently added unit material.', category: 'Progress', sizes: ['small', 'medium', 'large'], defaultSize: 'medium' }
]

export const WIDGET_BY_ID = Object.fromEntries(WIDGETS.map((widget) => [widget.id, widget])) as Record<WidgetId, WidgetDefinition>

export const WIDGET_SPANS: Record<WidgetSize, string> = {
  small: 'md:col-span-1',
  medium: 'md:col-span-1 xl:col-span-2',
  large: 'md:col-span-2 xl:col-span-3',
  wide: 'md:col-span-2 xl:col-span-4'
}