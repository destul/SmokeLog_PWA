import { describe, expect, test } from 'vitest'

import { defaultSettings, loadSettings, saveSettings } from './settings'

describe('local tracker settings', () => {
  test('loads defaults when no settings were saved', () => {
    const storage = new Map<string, string>()
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    }

    expect(loadSettings(adapter)).toEqual(defaultSettings)
  })

  test('round-trips notification, quiet-hour, and savings settings', () => {
    const storage = new Map<string, string>()
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    }
    const settings = {
      notificationsEnabled: false,
      quietHoursStart: 23,
      quietHoursEnd: 7,
      savingsGoalMinor: 25_000,
      reminderSentForEventId: 'event-1',
    }

    saveSettings(settings, adapter)
    expect(loadSettings(adapter)).toEqual(settings)
  })

  test('repairs malformed values instead of crashing the app', () => {
    const storage = new Map<string, string>([['smokelog.settings', '{"quietHoursStart":"late"}']])
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    }

    expect(loadSettings(adapter)).toEqual(defaultSettings)
  })
})
