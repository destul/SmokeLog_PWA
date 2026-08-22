import { describe, expect, test } from 'vitest'

import { summarizeDayHours, summarizeWeekAnalytics } from './analytics'
import type { ConsumptionEvent } from './types'

function event(overrides: Partial<ConsumptionEvent>): ConsumptionEvent {
  return {
    id: 'event-1',
    productId: 'product-1',
    category: 'cigarette',
    quantity: 1,
    occurredAt: '2026-08-20T08:00:00.000Z',
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    ...overrides,
  }
}

function localIso(day: number, hour: number, minute = 0): string {
  return new Date(2026, 7, day, hour, minute).toISOString()
}

describe('summarizeWeekAnalytics', () => {
  test('keeps seven calendar days, local hours, and tag quantities together', () => {
    const result = summarizeWeekAnalytics(
      [
        event({ id: 'coffee', quantity: 2, occurredAt: localIso(18, 8), tagId: 'coffee' }),
        event({ id: 'stress', quantity: 3, occurredAt: localIso(20, 21), tagId: 'stress' }),
        event({ id: 'untagged', quantity: 1, occurredAt: localIso(20, 21, 15) }),
      ],
      ['2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20'],
    )

    expect(result.days).toEqual([
      { key: '2026-08-14', quantity: 0 },
      { key: '2026-08-15', quantity: 0 },
      { key: '2026-08-16', quantity: 0 },
      { key: '2026-08-17', quantity: 0 },
      { key: '2026-08-18', quantity: 2 },
      { key: '2026-08-19', quantity: 0 },
      { key: '2026-08-20', quantity: 4 },
    ])
    expect(result.hours[8]).toBe(2)
    expect(result.hours[21]).toBe(4)
    expect(result.tags).toEqual([
      { id: 'stress', quantity: 3 },
      { id: 'coffee', quantity: 2 },
      { id: 'untagged', quantity: 1 },
    ])
  })
})

test('summarizes hourly consumption for one local calendar day only', () => {
  const result = summarizeDayHours(
    [
      event({ id: 'yesterday', occurredAt: localIso(20, 23), quantity: 3 }),
      event({ id: 'today-morning', occurredAt: localIso(21, 9), quantity: 2 }),
      event({ id: 'today-evening', occurredAt: localIso(21, 20), quantity: 1 }),
    ],
    '2026-08-21',
  )

  expect(result[23]).toBe(0)
  expect(result[9]).toBe(2)
  expect(result[20]).toBe(1)
  expect(result.reduce((total, quantity) => total + quantity, 0)).toBe(3)
})
