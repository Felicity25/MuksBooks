export interface UniversitySearchState {
  search: string
  country: string
  region: string
  studyArea: string
  qualification: string
}

export const DEFAULT_UNIVERSITY_SEARCH_STATE: UniversitySearchState = {
  search: '',
  country: 'All',
  region: 'All',
  studyArea: 'All',
  qualification: 'All'
}

const PARAM_KEYS: Record<keyof UniversitySearchState, string> = {
  search: 'q',
  country: 'country',
  region: 'region',
  studyArea: 'field',
  qualification: 'qualification'
}

export function parseUniversitySearchState(params: URLSearchParams | Readonly<URLSearchParams>): UniversitySearchState {
  return {
    search: params.get(PARAM_KEYS.search)?.trim() || '',
    country: params.get(PARAM_KEYS.country)?.trim() || 'All',
    region: params.get(PARAM_KEYS.region)?.trim() || 'All',
    studyArea: params.get(PARAM_KEYS.studyArea)?.trim() || 'All',
    qualification: params.get(PARAM_KEYS.qualification)?.trim() || 'All'
  }
}

export function serializeUniversitySearchState(state: UniversitySearchState) {
  const params = new URLSearchParams()
  for (const key of Object.keys(PARAM_KEYS) as Array<keyof UniversitySearchState>) {
    const value = state[key].trim()
    if (value && value !== 'All') params.set(PARAM_KEYS[key], value)
  }
  return params
}

export function updateUniversitySearchState(state: UniversitySearchState, updates: Partial<UniversitySearchState>) {
  return { ...state, ...updates }
}

export function hasActiveUniversitySearch(state: UniversitySearchState) {
  return Boolean(state.search || state.country !== 'All' || state.region !== 'All' || state.studyArea !== 'All' || state.qualification !== 'All')
}