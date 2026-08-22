import { describe, expect, test } from 'vitest'

import { filterJournalItems, journalDayLabel, summarizeJournalItems, type JournalItem } from './journal'
import type { Product } from './types'

const product: Product = {
  id: 'p', category: 'cigarette', name: 'Parliament', active: true,
  packagePriceMinor: 11000, unitsPerPackage: 20,
  createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
}

function item(id: string, occurredAt: string): JournalItem {
  return { kind: 'consumption', occurredAt, event: { id, productId: 'p', category: 'cigarette', quantity: 1, occurredAt, createdAt: occurredAt, updatedAt: occurredAt } }
}

describe('journal helpers', () => {
  test('filters by search, type and product safely', () => {
    const craving: JournalItem = { kind: 'craving', occurredAt: '2026-08-21T10:00:00.000Z', craving: { id: 'c', tagId: 'coffee', customReason: 'Кава', occurredAt: '2026-08-21T10:00:00.000Z', createdAt: '2026-08-21T10:00:00.000Z', updatedAt: '2026-08-21T10:00:00.000Z' } }
    const items = [item('1', '2026-08-21T09:00:00.000Z'), craving]
    expect(filterJournalItems(items, { search: 'кава', productId: '', kind: 'all', tagId: '' }, new Map([['p', product]]) )).toEqual([craving])
    expect(filterJournalItems(items, { search: '', productId: 'p', kind: 'consumption', tagId: '' }, new Map([['p', product]]) )).toHaveLength(1)
  })

  test('labels today, yesterday and older days', () => {
    const now = new Date(2026, 7, 21, 12)
    expect(journalDayLabel(new Date(2026, 7, 21, 8).toISOString(), now)).toBe('Сьогодні')
    expect(journalDayLabel(new Date(2026, 7, 20, 8).toISOString(), now)).toBe('Вчора')
  })

  test('summarizes visible journal items', () => {
    const items = [item('1', '2026-08-21T09:00:00.000Z'), item('2', '2026-08-21T10:30:00.000Z')]
    expect(summarizeJournalItems(items, new Map([['p', product]]))).toMatchObject({ consumptionQuantity: 2, costMinor: 1100, cravingCount: 0, longestPauseMinutes: 90 })
  })
})
