export type AppStateUpdateType =
  | 'courses'
  | 'tasks'
  | 'uploads'
  | 'settings'
  | 'planner'
  | 'careers'
  | 'dashboard'

const EVENT_NAME = 'muksbooks:app-state-updated'

export function emitAppStateUpdate(updateType: AppStateUpdateType) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { updateType, at: Date.now() } }))
}

export function onAppStateUpdate(listener: (updateType: AppStateUpdateType) => void) {
  if (typeof window === 'undefined') return () => {}

  const wrapped = (event: Event) => {
    const custom = event as CustomEvent<{ updateType?: AppStateUpdateType }>
    const type = custom.detail?.updateType
    if (type) listener(type)
  }

  window.addEventListener(EVENT_NAME, wrapped)
  return () => window.removeEventListener(EVENT_NAME, wrapped)
}
