import { describe, expect, test } from 'vitest'

import { isQuietHour, shouldSendPauseReminder } from './notifications'

describe('pause reminder rules', () => {
  test('waits until two hours after the last consumption', () => {
    const lastEvent = '2026-08-22T08:00:00.000Z'
    expect(shouldSendPauseReminder(lastEvent, new Date('2026-08-22T09:59:59.000Z'), true, false)).toBe(false)
    expect(shouldSendPauseReminder(lastEvent, new Date('2026-08-22T10:00:00.000Z'), true, false)).toBe(true)
  })

  test('does not repeat a reminder for the same pause or during quiet hours', () => {
    const lastEvent = '2026-08-22T08:00:00.000Z'
    expect(shouldSendPauseReminder(lastEvent, new Date('2026-08-22T11:00:00.000Z'), true, true)).toBe(false)
    expect(isQuietHour(23, 22, 8)).toBe(true)
    expect(isQuietHour(7, 22, 8)).toBe(true)
    expect(isQuietHour(12, 22, 8)).toBe(false)
  })

  test('can be disabled completely', () => {
    expect(shouldSendPauseReminder('2026-08-22T08:00:00.000Z', new Date('2026-08-22T12:00:00.000Z'), false, false)).toBe(false)
  })
})
