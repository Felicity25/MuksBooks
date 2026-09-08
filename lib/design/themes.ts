export type ThemeCategory = 'Focused' | 'Calm' | 'Warm' | 'Creative'

export type ThemeId =
  | 'muks-classic'
  | 'scholar-blue'
  | 'rose-espresso'
  | 'sage-library'
  | 'lavender-notes'
  | 'oxford'
  | 'matcha-study'
  | 'midnight'
  | 'golden-hour'
  | 'cloud'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  category: ThemeCategory
  preview: {
    sidebar: string
    background: string
    surface: string
    text: string
    accent: string
  }
  tokens: Record<string, string>
}

const common = {
  radiusSm: '8px',
  radiusMd: '12px',
  radiusLg: '16px',
  shadowSoft: '0 8px 24px rgba(2, 6, 23, 0.06)',
  shadowRaised: '0 16px 34px rgba(2, 6, 23, 0.12)'
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'muks-classic',
    name: 'Muks Classic',
    category: 'Focused',
    preview: { sidebar: '#0B132B', background: '#f7f9fc', surface: '#ffffff', text: '#0b132b', accent: '#5BC0BE' },
    tokens: {
      '--app-background': '#f7f9fc',
      '--surface': '#ffffff',
      '--surface-secondary': '#eef3f8',
      '--surface-tertiary': '#e2e9f2',
      '--sidebar': '#0B132B',
      '--sidebar-text': '#dbe7ff',
      '--sidebar-muted': '#94a6c6',
      '--sidebar-border': '#1C2541',
      '--text-primary': '#0f172a',
      '--text-secondary': '#334155',
      '--text-muted': '#64748b',
      '--primary': '#1C2541',
      '--primary-hover': '#233354',
      '--primary-active': '#0f1d36',
      '--accent': '#5BC0BE',
      '--accent-strong': '#2ca9a6',
      '--accent-subtle': '#d8f3f1',
      '--border': '#d7e0eb',
      '--border-strong': '#b8c4d5',
      '--focus': '#5BC0BE',
      '--success': '#15803d',
      '--warning': '#b45309',
      '--danger': '#b91c1c',
      '--input-background': '#ffffff',
      '--hover-background': '#eef3f8',
      '--selected-background': '#d8f3f1',
      '--radius-sm': common.radiusSm,
      '--radius-md': common.radiusMd,
      '--radius-lg': common.radiusLg,
      '--shadow-soft': common.shadowSoft,
      '--shadow-raised': common.shadowRaised
    }
  },
  {
    id: 'scholar-blue',
    name: 'Scholar Blue',
    category: 'Focused',
    preview: { sidebar: '#36494E', background: '#f5f9fe', surface: '#ffffff', text: '#17212a', accent: '#597081' },
    tokens: {
      '--app-background': '#f5f9fe',
      '--surface': '#ffffff',
      '--surface-secondary': '#e8f0f8',
      '--surface-tertiary': '#dbe7f3',
      '--sidebar': '#36494E',
      '--sidebar-text': '#edf2f5',
      '--sidebar-muted': '#b7c6cf',
      '--sidebar-border': '#425b61',
      '--text-primary': '#12202b',
      '--text-secondary': '#2b3d48',
      '--text-muted': '#597081',
      '--primary': '#36494E',
      '--primary-hover': '#2f4045',
      '--primary-active': '#27363b',
      '--accent': '#7EA0B7',
      '--accent-strong': '#597081',
      '--accent-subtle': '#e6eef3',
      '--border': '#d6e1ea',
      '--border-strong': '#bdccda',
      '--focus': '#597081',
      '--success': '#0f766e',
      '--warning': '#b45309',
      '--danger': '#b91c1c',
      '--input-background': '#ffffff',
      '--hover-background': '#ecf2f8',
      '--selected-background': '#e1ebf3',
      '--radius-sm': common.radiusSm,
      '--radius-md': common.radiusMd,
      '--radius-lg': common.radiusLg,
      '--shadow-soft': common.shadowSoft,
      '--shadow-raised': common.shadowRaised
    }
  },
  {
    id: 'rose-espresso',
    name: 'Rose Espresso',
    category: 'Warm',
    preview: { sidebar: '#2A0800', background: '#fcf7f6', surface: '#fffdfc', text: '#2A0800', accent: '#C09891' },
    tokens: {
      '--app-background': '#fcf7f6',
      '--surface': '#fffdfc',
      '--surface-secondary': '#f6ecea',
      '--surface-tertiary': '#eddeda',
      '--sidebar': '#2A0800',
      '--sidebar-text': '#f2dcd8',
      '--sidebar-muted': '#cbaea8',
      '--sidebar-border': '#533127',
      '--text-primary': '#2a0800',
      '--text-secondary': '#5d3c35',
      '--text-muted': '#775144',
      '--primary': '#775144',
      '--primary-hover': '#5e4036',
      '--primary-active': '#4d342b',
      '--accent': '#C09891',
      '--accent-strong': '#9f746d',
      '--accent-subtle': '#f3e4e1',
      '--border': '#e8d6d3',
      '--border-strong': '#d8c0bc',
      '--focus': '#9f746d',
      '--success': '#166534',
      '--warning': '#b45309',
      '--danger': '#b91c1c',
      '--input-background': '#fffdfc',
      '--hover-background': '#f7efed',
      '--selected-background': '#f2e0dc',
      '--radius-sm': common.radiusSm,
      '--radius-md': common.radiusMd,
      '--radius-lg': common.radiusLg,
      '--shadow-soft': common.shadowSoft,
      '--shadow-raised': common.shadowRaised
    }
  },
  {
    id: 'sage-library',
    name: 'Sage Library',
    category: 'Calm',
    preview: { sidebar: '#1E2A1D', background: '#f6faf5', surface: '#ffffff', text: '#1f2b22', accent: '#71816D' },
    tokens: {
      '--app-background': '#f6faf5',
      '--surface': '#ffffff',
      '--surface-secondary': '#ecf3ea',
      '--surface-tertiary': '#dce8d8',
      '--sidebar': '#1E2A1D',
      '--sidebar-text': '#dbe8d8',
      '--sidebar-muted': '#9ab09a',
      '--sidebar-border': '#2f3e2d',
      '--text-primary': '#1f2b22',
      '--text-secondary': '#40513B',
      '--text-muted': '#5f755d',
      '--primary': '#40513B',
      '--primary-hover': '#354531',
      '--primary-active': '#2b3828',
      '--accent': '#71816D',
      '--accent-strong': '#567053',
      '--accent-subtle': '#dce8d8',
      '--border': '#ceddcb',
      '--border-strong': '#afc3ab',
      '--focus': '#567053',
      '--success': '#166534',
      '--warning': '#a16207',
      '--danger': '#b91c1c',
      '--input-background': '#ffffff',
      '--hover-background': '#edf3eb',
      '--selected-background': '#dde9da',
      '--radius-sm': common.radiusSm,
      '--radius-md': common.radiusMd,
      '--radius-lg': common.radiusLg,
      '--shadow-soft': common.shadowSoft,
      '--shadow-raised': common.shadowRaised
    }
  },
  {
    id: 'lavender-notes',
    name: 'Lavender Notes',
    category: 'Creative',
    preview: { sidebar: '#332B4A', background: '#f8f5fc', surface: '#ffffff', text: '#332B4A', accent: '#A58ADE' },
    tokens: {
      '--app-background': '#f8f5fc',
      '--surface': '#ffffff',
      '--surface-secondary': '#f0e9fb',
      '--surface-tertiary': '#e3d6f6',
      '--sidebar': '#332B4A',
      '--sidebar-text': '#ece5f8',
      '--sidebar-muted': '#c8badd',
      '--sidebar-border': '#4a3f66',
      '--text-primary': '#332b4a',
      '--text-secondary': '#4d4270',
      '--text-muted': '#67568C',
      '--primary': '#67568C',
      '--primary-hover': '#564675',
      '--primary-active': '#46385f',
      '--accent': '#A58ADE',
      '--accent-strong': '#836bbd',
      '--accent-subtle': '#ece3fa',
      '--border': '#ddd0f2',
      '--border-strong': '#c8b6e7',
      '--focus': '#836bbd',
      '--success': '#166534',
      '--warning': '#a16207',
      '--danger': '#b91c1c',
      '--input-background': '#ffffff',
      '--hover-background': '#f1ebfb',
      '--selected-background': '#e7dcf8',
      '--radius-sm': common.radiusSm,
      '--radius-md': common.radiusMd,
      '--radius-lg': common.radiusLg,
      '--shadow-soft': common.shadowSoft,
      '--shadow-raised': common.shadowRaised
    }
  },
  {
    id: 'oxford',
    name: 'Oxford',
    category: 'Focused',
    preview: { sidebar: '#14213D', background: '#faf7f1', surface: '#ffffff', text: '#14213D', accent: '#6B7A8F' },
    tokens: {
      '--app-background': '#faf7f1',
      '--surface': '#ffffff',
      '--surface-secondary': '#f1ebe1',
      '--surface-tertiary': '#e4dacb',
      '--sidebar': '#14213D',
      '--sidebar-text': '#e9e2d6',
      '--sidebar-muted': '#c9b79c',
      '--sidebar-border': '#2C415C',
      '--text-primary': '#1a2742',
      '--text-secondary': '#304766',
      '--text-muted': '#5d6f85',
      '--primary': '#2C415C',
      '--primary-hover': '#24364c',
      '--primary-active': '#1d2d3f',
      '--accent': '#6B7A8F',
      '--accent-strong': '#4c5f78',
      '--accent-subtle': '#e6ebf2',
      '--border': '#ddd2c3',
      '--border-strong': '#c5b6a2',
      '--focus': '#4c5f78',
      '--success': '#166534',
      '--warning': '#a16207',
      '--danger': '#b91c1c',
      '--input-background': '#ffffff',
      '--hover-background': '#f3eee5',
      '--selected-background': '#e8e0d2',
      '--radius-sm': common.radiusSm,
      '--radius-md': common.radiusMd,
      '--radius-lg': common.radiusLg,
      '--shadow-soft': common.shadowSoft,
      '--shadow-raised': common.shadowRaised
    }
  },
  {
    id: 'matcha-study',
    name: 'Matcha Study',
    category: 'Calm',
    preview: { sidebar: '#253528', background: '#f7fbf2', surface: '#ffffff', text: '#253528', accent: '#9BB98C' },
    tokens: {
      '--app-background': '#f7fbf2',
      '--surface': '#ffffff',
      '--surface-secondary': '#edf4e5',
      '--surface-tertiary': '#dde9d2',
      '--sidebar': '#253528',
      '--sidebar-text': '#e5efde',
      '--sidebar-muted': '#b8ccae',
      '--sidebar-border': '#3a4f3d',
      '--text-primary': '#253528',
      '--text-secondary': '#3f5841',
      '--text-muted': '#587451',
      '--primary': '#587451',
      '--primary-hover': '#4b6345',
      '--primary-active': '#3e5239',
      '--accent': '#9BB98C',
      '--accent-strong': '#78986d',
      '--accent-subtle': '#e6f0de',
      '--border': '#cfdfc1',
      '--border-strong': '#b7cdab',
      '--focus': '#78986d',
      '--success': '#166534',
      '--warning': '#a16207',
      '--danger': '#b91c1c',
      '--input-background': '#ffffff',
      '--hover-background': '#eef4e7',
      '--selected-background': '#dfebd4',
      '--radius-sm': common.radiusSm,
      '--radius-md': common.radiusMd,
      '--radius-lg': common.radiusLg,
      '--shadow-soft': common.shadowSoft,
      '--shadow-raised': common.shadowRaised
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    category: 'Focused',
    preview: { sidebar: '#0D1117', background: '#0f141c', surface: '#161B22', text: '#C9D1D9', accent: '#58A6FF' },
    tokens: {
      '--app-background': '#0f141c',
      '--surface': '#161B22',
      '--surface-secondary': '#1c2430',
      '--surface-tertiary': '#212b38',
      '--sidebar': '#0D1117',
      '--sidebar-text': '#c9d1d9',
      '--sidebar-muted': '#8b949e',
      '--sidebar-border': '#21262D',
      '--text-primary': '#e6edf3',
      '--text-secondary': '#c9d1d9',
      '--text-muted': '#9aa6b2',
      '--primary': '#58A6FF',
      '--primary-hover': '#3d8cec',
      '--primary-active': '#2f78cc',
      '--accent': '#58A6FF',
      '--accent-strong': '#2f81f7',
      '--accent-subtle': '#1e324b',
      '--border': '#2f3b4a',
      '--border-strong': '#3a495c',
      '--focus': '#58A6FF',
      '--success': '#22c55e',
      '--warning': '#f59e0b',
      '--danger': '#ef4444',
      '--input-background': '#0f141c',
      '--hover-background': '#1c2430',
      '--selected-background': '#243448',
      '--radius-sm': common.radiusSm,
      '--radius-md': common.radiusMd,
      '--radius-lg': common.radiusLg,
      '--shadow-soft': '0 10px 30px rgba(0, 0, 0, 0.35)',
      '--shadow-raised': '0 20px 45px rgba(0, 0, 0, 0.45)'
    }
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    category: 'Warm',
    preview: { sidebar: '#2F261C', background: '#fffaf0', surface: '#ffffff', text: '#2F261C', accent: '#D6A756' },
    tokens: {
      '--app-background': '#fffaf0',
      '--surface': '#ffffff',
      '--surface-secondary': '#f8eed6',
      '--surface-tertiary': '#f2e1b4',
      '--sidebar': '#2F261C',
      '--sidebar-text': '#f6ead6',
      '--sidebar-muted': '#d7b988',
      '--sidebar-border': '#4b3c2f',
      '--text-primary': '#2f261c',
      '--text-secondary': '#5a472e',
      '--text-muted': '#765827',
      '--primary': '#765827',
      '--primary-hover': '#634a20',
      '--primary-active': '#513d1a',
      '--accent': '#D6A756',
      '--accent-strong': '#b9842b',
      '--accent-subtle': '#f8ebcc',
      '--border': '#ebddb8',
      '--border-strong': '#dcc999',
      '--focus': '#b9842b',
      '--success': '#166534',
      '--warning': '#b45309',
      '--danger': '#b91c1c',
      '--input-background': '#ffffff',
      '--hover-background': '#f9efd9',
      '--selected-background': '#f3e1b6',
      '--radius-sm': common.radiusSm,
      '--radius-md': common.radiusMd,
      '--radius-lg': common.radiusLg,
      '--shadow-soft': common.shadowSoft,
      '--shadow-raised': common.shadowRaised
    }
  },
  {
    id: 'cloud',
    name: 'Cloud',
    category: 'Calm',
    preview: { sidebar: '#1E293B', background: '#F8FAFC', surface: '#ffffff', text: '#1E293B', accent: '#64748B' },
    tokens: {
      '--app-background': '#F8FAFC',
      '--surface': '#ffffff',
      '--surface-secondary': '#f1f5f9',
      '--surface-tertiary': '#e2e8f0',
      '--sidebar': '#1E293B',
      '--sidebar-text': '#e2e8f0',
      '--sidebar-muted': '#94a3b8',
      '--sidebar-border': '#334155',
      '--text-primary': '#1e293b',
      '--text-secondary': '#334155',
      '--text-muted': '#64748B',
      '--primary': '#334155',
      '--primary-hover': '#293548',
      '--primary-active': '#1f2937',
      '--accent': '#64748B',
      '--accent-strong': '#475569',
      '--accent-subtle': '#e2e8f0',
      '--border': '#d9e2ec',
      '--border-strong': '#c7d2df',
      '--focus': '#475569',
      '--success': '#15803d',
      '--warning': '#b45309',
      '--danger': '#b91c1c',
      '--input-background': '#ffffff',
      '--hover-background': '#f1f5f9',
      '--selected-background': '#e2e8f0',
      '--radius-sm': common.radiusSm,
      '--radius-md': common.radiusMd,
      '--radius-lg': common.radiusLg,
      '--shadow-soft': common.shadowSoft,
      '--shadow-raised': common.shadowRaised
    }
  }
]

export const DEFAULT_THEME_ID: ThemeId = 'oxford'

export const THEMES_BY_ID: Record<ThemeId, ThemeDefinition> = THEMES.reduce((acc, theme) => {
  acc[theme.id] = theme
  return acc
}, {} as Record<ThemeId, ThemeDefinition>)

export function resolveThemeId(theme: string, prefersDark: boolean): ThemeId {
  if (theme === 'system') {
    return prefersDark ? 'midnight' : DEFAULT_THEME_ID
  }
  if (theme === 'light') return DEFAULT_THEME_ID
  if (theme === 'dark') return 'midnight'
  if ((THEMES_BY_ID as Record<string, ThemeDefinition | undefined>)[theme]) {
    return theme as ThemeId
  }
  return DEFAULT_THEME_ID
}
