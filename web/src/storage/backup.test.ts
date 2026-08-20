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

const craving = {
  id: 'craving-1', tagId: 'addiction', outcome: 'resisted', customReason: 'Після дзвінка',
  occurredAt: '2026-08-20T09:00:00.000Z', resolvedAt: '2026-08-20T09:05:00.000Z',
  createdAt: '2026-08-20T09:00:00.000Z', updatedAt: '2026-08-20T09:05:00.000Z',
} as const

describe('backup format', () => {
  test('round-trips products, events, and cravings in version two', () => {
    const backup = createBackup([product], [event], [craving], '2026-08-20T10:00:00.000Z')

    expect(parseBackup(JSON.stringify(backup))).toEqual(backup)
  })

  test('parses a version-one backup as version two with no cravings', () => {
    const legacyBackup = {
      version: 1,
      exportedAt: '2026-08-20T10:00:00.000Z',
      products: [product],
      events: [event],
    }

    expect(parseBackup(JSON.stringify(legacyBackup))).toEqual({
      ...legacyBackup,
      version: 2,
      cravings: [],
    })
  })

  test('trims a valid custom craving reason during import', () => {
    const backup = createBackup(
      [product],
      [event],
      [{ ...craving, customReason: '  Після дзвінка  ' }],
      '2026-08-20T10:00:00.000Z',
    )

    expect(parseBackup(JSON.stringify(backup)).cravings[0].customReason).toBe('Після дзвінка')
  })

  test.each([
    { ...craving, tagId: 'invented' },
    { ...craving, outcome: 'ignored' },
    { ...craving, customReason: 'x'.repeat(121) },
    { ...craving, resolvedAt: 'not-a-date' },
  ])('rejects invalid craving data', (invalidCraving) => {
    const malformed = JSON.stringify({
      version: 2,
      exportedAt: '2026-08-20T10:00:00.000Z',
      products: [product],
      events: [event],
      cravings: [invalidCraving],
    })

    expect(() => parseBackup(malformed)).toThrow('Резервна копія містить некоректні дані.')
  })

  test('rejects an event which refers to a missing product', () => {
    const malformed = JSON.stringify({ version: 1, exportedAt: '2026-08-20T10:00:00.000Z', products: [], events: [event] })

    expect(() => parseBackup(malformed)).toThrow('Продукт для запису не знайдено.')
  })

  test('rejects an unknown backup version', () => {
    expect(() => parseBackup(JSON.stringify({ version: 3, products: [], events: [], cravings: [] }))).toThrow('Непідтримуваний формат резервної копії.')
  })
})
