import { describe, expect, test } from 'vitest'

import { localDateTimeInputToIso } from './dates'

describe('datetime-local conversion', () => {
  test('preserves the selected local calendar date across midnight', () => {
    const iso = localDateTimeInputToIso('2026-08-20T23:54')
    expect(iso).not.toBeNull()
    const parsed = new Date(iso as string)
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(7)
    expect(parsed.getDate()).toBe(20)
    expect(parsed.getHours()).toBe(23)
    expect(parsed.getMinutes()).toBe(54)
  })
})
