import { describe, expect, test } from 'vitest'

import { formatElapsedSince } from './elapsed'

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
})
