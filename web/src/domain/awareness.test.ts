import { describe, expect, test } from 'vitest'

import { contextualPrompt, forecastForPeriod, summarizeAwareness } from './awareness'
import type { ConsumptionEvent, CravingEvent, Product } from './types'

const now = new Date(2026, 7, 20, 12, 0)

function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    category: 'cigarette',
    name: id,
    active: true,
    packagePriceMinor: 11_000,
    unitsPerPackage: 20,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
    ...overrides,
  }
}

function consumption(day: number, overrides: Partial<ConsumptionEvent> = {}): ConsumptionEvent {
  const occurredAt = new Date(2026, 7, day, 12, 0).toISOString()
  return {
    id: `event-${day}`,
    productId: 'cigarette',
    category: 'cigarette',
    quantity: 1,
    occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    ...overrides,
  }
}

function craving(id: string, overrides: Partial<CravingEvent> = {}): CravingEvent {
  const occurredAt = new Date(2026, 7, 20, 11, 0).toISOString()
  return {
    id,
    tagId: 'addiction',
    occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    ...overrides,
  }
}

describe('forecastForPeriod', () => {
  const products = new Map([
    ['cigarette', product('cigarette')],
    ['vape', product('vape', { category: 'vape', packagePriceMinor: 9_999, unitsPerPackage: 1 })],
  ])

  test('does not produce a forecast until all seven recent local days are observed', () => {
    expect(
      forecastForPeriod(
        [14, 15, 16, 17, 18, 19].map((day) => consumption(day)),
        products,
        now,
        30,
      ),
    ).toBeNull()
  })

  test('does not count an event later than now toward the observation window', () => {
    const events = [14, 15, 16, 17, 18, 19].map((day) => consumption(day))
    events.push(consumption(20, { occurredAt: new Date(2026, 7, 20, 18, 0).toISOString() }))

    expect(forecastForPeriod(events, products, now, 30)).toBeNull()
  })

  test('projects cost and seven-minute cigarette or stick time after seven observed days', () => {
    expect(
      forecastForPeriod(
        [14, 15, 16, 17, 18, 19, 20].map((day) => consumption(day)),
        products,
        now,
        30,
      ),
    ).toEqual({ costMinor: 16_500, estimatedMinutes: 210, periodDays: 30 })
  })

  test('vapes establish an observed day but contribute neither price nor seven-minute time', () => {
    const events = [14, 15, 16, 17, 18, 19, 20].map((day) =>
      consumption(day, { productId: 'vape', category: 'vape', quantity: 20 }),
    )

    expect(forecastForPeriod(events, products, now, 90)).toEqual({
      costMinor: 0,
      estimatedMinutes: 0,
      periodDays: 90,
    })
  })
})

describe('summarizeAwareness', () => {
  test('counts craving outcomes separately and sorts trigger totals deterministically', () => {
    const cravings = [
      craving('1', { outcome: 'smoked' }),
      craving('2', { outcome: 'smoked', tagId: 'coffee' }),
      craving('3', { outcome: 'resisted', tagId: 'coffee' }),
      craving('4', { outcome: 'resisted', tagId: 'stress' }),
      craving('5', { outcome: 'resisted', tagId: 'stress' }),
      craving('6', { tagId: 'morning' }),
    ]

    const summary = summarizeAwareness(cravings)

    expect(summary.outcomes).toEqual({ smoked: 2, resisted: 3, unresolved: 1 })
    expect(summary.triggers).toEqual([
      { tagId: 'coffee', count: 2 },
      { tagId: 'stress', count: 2 },
      { tagId: 'addiction', count: 1 },
      { tagId: 'morning', count: 1 },
    ])
    expect(summary.byHour[11]).toBe(6)
  })

  test('limits the summary to the requested local day keys', () => {
    const summary = summarizeAwareness(
      [
        craving('inside', { occurredAt: new Date(2026, 7, 20, 9, 0).toISOString() }),
        craving('outside', { occurredAt: new Date(2026, 7, 19, 9, 0).toISOString() }),
      ],
      ['2026-08-20'],
    )

    expect(summary.outcomes.unresolved).toBe(1)
  })
})

test('uses a calm contextual prompt without promising recovery', () => {
  expect(contextualPrompt('addiction')).toBe('Тяга — це сигнал залежності, а не наказ діяти.')
})
