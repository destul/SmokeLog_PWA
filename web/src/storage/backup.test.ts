import { describe, expect, test } from 'vitest'

import { createBackup, parseBackup } from './backup'

const product = {
  id: 'parliament', category: 'cigarette', name: 'Parliament', active: true,
  packagePriceMinor: 11_000, unitsPerPackage: 20,
  createdAt: '2026-08-20T08:00:00.000Z', updatedAt: '2026-08-20T08:00:00.000Z',
} as const

const event = {
  id: 'event-1', productId: 'parliament', category: 'cigarette', quantity: 1, tagId: 'coffee',
  occurredAt: '2026-08-20T08:00:00.000Z', createdAt: '2026-08-20T08:00:00.000Z', updatedAt: '2026-08-20T08:00:00.000Z',
} as const

describe('backup format', () => {
  test('round-trips products and tagged events in version one', () => {
    const backup = createBackup([product], [event], '2026-08-20T10:00:00.000Z')

    expect(parseBackup(JSON.stringify(backup))).toEqual(backup)
  })

  test('rejects an event which refers to a missing product', () => {
    const malformed = JSON.stringify({ version: 1, exportedAt: '2026-08-20T10:00:00.000Z', products: [], events: [event] })

    expect(() => parseBackup(malformed)).toThrow('Продукт для запису не знайдено.')
  })

  test('rejects an unknown backup version', () => {
    expect(() => parseBackup(JSON.stringify({ version: 2, products: [], events: [] }))).toThrow('Непідтримуваний формат резервної копії.')
  })
})
