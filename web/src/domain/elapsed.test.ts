import { describe, expect, test } from 'vitest'

import { formatElapsedSince, latestPastEvent } from './elapsed'

describe('formatElapsedSince', () => {
  test('formats a same-hour interval in minutes', () => {
    expect(formatElapsedSince('2026-08-20T08:13:00.000Z', new Date('2026-08-20T08:59:00.000Z'))).toBe('46 хв')
  })

  test('formats an interval with hours and zero-padded minutes', () => {
    expect(formatElapsedSince('2026-08-20T08:00:00.000Z', new Date('2026-08-20T10:05:00.000Z'))).toBe('2 год 05 хв')
  })

  test('formats multi-day intervals without a negative value', () => {
    expect(formatElapsedSince('2026-08-18T07:00:00.000Z', new Date('2026-08-20T10:05:00.000Z'))).toBe('2 дн 3 год')
  })

  test('selects the latest event that has already happened, ignoring future-dated records', () => {
    const events = [
      { id: 'future', occurredAt: '2026-08-21T20:54:00.000Z' },
      { id: 'latest-past', occurredAt: '2026-08-20T21:36:00.000Z' },
      { id: 'older-past', occurredAt: '2026-08-20T21:25:00.000Z' },
    ]

    expect(latestPastEvent(events, new Date('2026-08-20T21:36:00.000Z'))?.id).toBe('latest-past')
  })
})
