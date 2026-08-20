import { describe, expect, test } from 'vitest'

import { recentQuickProducts } from './quick-products'
import type { ConsumptionEvent, Product } from './types'

const timestamp = '2026-08-20T08:00:00.000Z'

function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    category: 'cigarette',
    name: id,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  }
}

function event(id: string, productId: string, occurredAt: string): ConsumptionEvent {
  return {
    id,
    productId,
    category: 'cigarette',
    quantity: 1,
    occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  }
}

describe('recentQuickProducts', () => {
  test('selects at most three distinct active products by most recent consumption', () => {
    const products = [
      product('lm100'),
      product('iqos', { category: 'stick' }),
      product('blue'),
      product('hidden', { active: false }),
    ]
    const events = [
      event('older', 'lm100', '2026-08-20T07:00:00.000Z'),
      event('middle', 'iqos', '2026-08-20T08:00:00.000Z'),
      event('newer', 'blue', '2026-08-20T09:00:00.000Z'),
      event('duplicate', 'blue', '2026-08-20T10:00:00.000Z'),
      event('hidden-event', 'hidden', '2026-08-20T11:00:00.000Z'),
    ]

    expect(recentQuickProducts(products, events).map((item) => item.id)).toEqual([
      'blue',
      'iqos',
      'lm100',
    ])
  })

  test('fills unused slots with the newest active products', () => {
    const products = [
      product('old', { createdAt: '2026-08-18T08:00:00.000Z' }),
      product('new', { createdAt: '2026-08-20T08:00:00.000Z' }),
      product('used', { createdAt: '2026-08-19T08:00:00.000Z' }),
      product('newest', { createdAt: '2026-08-21T08:00:00.000Z' }),
    ]

    expect(
      recentQuickProducts(products, [event('used-event', 'used', timestamp)]).map(
        (item) => item.id,
      ),
    ).toEqual(['used', 'newest', 'new'])
  })
})
