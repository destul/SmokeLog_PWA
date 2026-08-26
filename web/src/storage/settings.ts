import type { Language } from '../domain/types'

export type TrackerSettings = {
  notificationsEnabled: boolean
  quietHoursStart: number
  quietHoursEnd: number
  savingsGoalMinor: number | null
  reminderSentForEventId: string | null
  language: Language
  dailyGoalQuantity: number | null
  safariHelpDismissed: boolean
}

export const defaultSettings: TrackerSettings = {
  notificationsEnabled: true,
  quietHoursStart: 22,
  quietHoursEnd: 8,
  savingsGoalMinor: null,
  reminderSentForEventId: null,
  language: 'uk',
  dailyGoalQuantity: null,
  safariHelpDismissed: false,
}

const SETTINGS_KEY = 'smokelog.settings'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function validHour(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23
}

function validGoal(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0)
}

function validLanguage(value: unknown): value is Language {
  return value === 'uk' || value === 'ru' || value === 'en'
}

export function loadSettings(storage: StorageLike = window.localStorage): TrackerSettings {
  const serialized = storage.getItem(SETTINGS_KEY)
  if (!serialized) return { ...defaultSettings }

  try {
    const value: unknown = JSON.parse(serialized)
    if (!value || typeof value !== 'object') return { ...defaultSettings }
    const record = value as Record<string, unknown>
    if (
      typeof record.notificationsEnabled !== 'boolean' ||
      !validHour(record.quietHoursStart) ||
      !validHour(record.quietHoursEnd) ||
      !validGoal(record.savingsGoalMinor) ||
      (record.reminderSentForEventId !== null && typeof record.reminderSentForEventId !== 'string') ||
      (record.language !== undefined && !validLanguage(record.language)) ||
      (record.dailyGoalQuantity !== undefined && !validGoal(record.dailyGoalQuantity)) ||
      (record.safariHelpDismissed !== undefined && typeof record.safariHelpDismissed !== 'boolean')
    ) return { ...defaultSettings }

    return {
      notificationsEnabled: record.notificationsEnabled,
      quietHoursStart: record.quietHoursStart,
      quietHoursEnd: record.quietHoursEnd,
      savingsGoalMinor: record.savingsGoalMinor,
      reminderSentForEventId: record.reminderSentForEventId,
      language: validLanguage(record.language) ? record.language : defaultSettings.language,
      dailyGoalQuantity: validGoal(record.dailyGoalQuantity) ? record.dailyGoalQuantity : defaultSettings.dailyGoalQuantity,
      safariHelpDismissed: typeof record.safariHelpDismissed === 'boolean' ? record.safariHelpDismissed : defaultSettings.safariHelpDismissed,
    }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(settings: TrackerSettings, storage: StorageLike = window.localStorage): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
