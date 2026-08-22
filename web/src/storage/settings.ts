export type TrackerSettings = {
  notificationsEnabled: boolean
  quietHoursStart: number
  quietHoursEnd: number
  savingsGoalMinor: number | null
  reminderSentForEventId: string | null
}

export const defaultSettings: TrackerSettings = {
  notificationsEnabled: true,
  quietHoursStart: 22,
  quietHoursEnd: 8,
  savingsGoalMinor: null,
  reminderSentForEventId: null,
}

const SETTINGS_KEY = 'smokelog.settings'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function validHour(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23
}

function validGoal(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0)
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
      (record.reminderSentForEventId !== null && typeof record.reminderSentForEventId !== 'string')
    ) return { ...defaultSettings }

    return {
      notificationsEnabled: record.notificationsEnabled,
      quietHoursStart: record.quietHoursStart,
      quietHoursEnd: record.quietHoursEnd,
      savingsGoalMinor: record.savingsGoalMinor,
      reminderSentForEventId: record.reminderSentForEventId,
    }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(settings: TrackerSettings, storage: StorageLike = window.localStorage): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
