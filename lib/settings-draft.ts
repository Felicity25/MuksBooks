import type { UserSettings } from './user-settings.ts'

export function mergeSettingsHydration(
  draft: UserSettings,
  incoming: UserSettings,
  dirtyFields: ReadonlySet<keyof UserSettings>
): UserSettings {
  const next = { ...draft }
  for (const key of Object.keys(incoming) as Array<keyof UserSettings>) {
    if (!dirtyFields.has(key)) (next as Record<keyof UserSettings, UserSettings[keyof UserSettings]>)[key] = incoming[key]
  }
  return next
}

export function reconcileSavedFields(
  dirtyFields: ReadonlySet<keyof UserSettings>,
  savedPayload: Partial<UserSettings>,
  currentDraft: UserSettings
): { dirtyFields: Set<keyof UserSettings>; hasNewerEdits: boolean } {
  const next = new Set(dirtyFields)
  let hasNewerEdits = false
  for (const key of Object.keys(savedPayload) as Array<keyof UserSettings>) {
    if (JSON.stringify(currentDraft[key]) === JSON.stringify(savedPayload[key])) next.delete(key)
    else hasNewerEdits = true
  }
  return { dirtyFields: next, hasNewerEdits }
}