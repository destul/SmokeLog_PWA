import { describe, expect, test } from 'vitest'

import { healthInsightForProduct } from './health'
import type { Product } from './types'

const base: Product = {
  id: 'product',
  category: 'cigarette',
  name: 'Product',
  active: true,
  createdAt: '2026-08-20T08:00:00.000Z',
  updatedAt: '2026-08-20T08:00:00.000Z',
}

describe('healthInsightForProduct', () => {
  test('uses tobacco-snus education only for tobacco snus', () => {
    const tobacco = healthInsightForProduct({ ...base, category: 'snus', snusKind: 'tobacco' })
    const pouch = healthInsightForProduct({
      ...base,
      category: 'snus',
      snusKind: 'nicotine-pouch',
    })

    expect(tobacco.title).toContain('Рот')
    expect(tobacco.body).toContain('рак')
    expect(pouch.title).toContain('Нікотин')
    expect(pouch.body).not.toContain('рак')
  })

  test('does not assume an old snus product contains tobacco', () => {
    const insight = healthInsightForProduct({ ...base, category: 'snus' })

    expect(insight.title).toContain('Нікотин')
    expect(insight.body).not.toContain('рак')
  })

  test.each([
    ['cigarette', 'Судини'],
    ['stick', 'Нагрівання'],
    ['vape', 'Аерозоль'],
  ] as const)('selects dedicated %s education', (category, title) => {
    const insight = healthInsightForProduct({ ...base, category })

    expect(insight.title).toContain(title)
    expect(insight.sourceUrl).toMatch(/^https:\/\/www\.cdc\.gov\//)
  })

  test('defaults to cigarette education when no product exists', () => {
    expect(healthInsightForProduct(undefined).title).toContain('Судини')
  })
})
