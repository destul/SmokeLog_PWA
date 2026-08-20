import { beforeEach, describe, expect, test } from 'vitest'

import { resetDatabaseForTests, deactivateProduct, importBackup, listEvents, listProducts, saveEvent, saveProduct } from './db'
import type { ConsumptionEvent, Product } from '../domain/types'

const timestamp = '2026-08-20T08:00:00.000Z'

const product: Product = {
  id: 'parliament', category: 'cigarette', name: 'Parliament', active: true,
  packagePriceMinor: 11_000, unitsPerPackage: 20, createdAt: timestamp, updatedAt: timestamp,
}

function event(id: string, occurredAt: string): ConsumptionEvent {
  return { id, productId: product.id, category: 'cigarette', quantity: 1, occurredAt, createdAt: timestamp, updatedAt: timestamp }
}

describe('IndexedDB journal', () => {
  beforeEach(async () => {
    await resetDatabaseForTests()
  })

  test('lists saved events in reverse occurrence order', async () => {
    await saveEvent(event('early', '2026-08-20T08:00:00.000Z'))
    await saveEvent(event('late', '2026-08-20T10:00:00.000Z'))

    expect((await listEvents()).map(({ id }) => id)).toEqual(['late', 'early'])
  })

  test('deactivates a product without removing its history', async () => {
    await saveProduct(product)
    await saveEvent(event('event-1', timestamp))
    await deactivateProduct(product.id)

    expect(await listEvents()).toHaveLength(1)
    expect((await listProducts({ includeInactive: true }))[0].active).toBe(false)
  })

  test('imports a validated backup as upserts without deleting local data', async () => {
    await saveProduct({ ...product, id: 'local', name: 'Локальний' })
    await importBackup({ products: [product], events: [event('imported', timestamp)] })

    expect((await listProducts({ includeInactive: true }).then((items) => items.map((item) => item.id)))).toEqual(['local', 'parliament'])
    expect((await listEvents()).map((item) => item.id)).toEqual(['imported'])
  })
})
