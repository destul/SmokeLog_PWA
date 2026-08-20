import { beforeEach, describe, expect, test } from 'vitest'
import { openDB } from 'idb'

import {
  deactivateProduct,
  deleteCraving,
  importBackup,
  listCravings,
  listEvents,
  listProducts,
  resetDatabaseForTests,
  saveCraving,
  saveEvent,
  saveProduct,
} from './db'
import type { ConsumptionEvent, CravingEvent, Product } from '../domain/types'

const timestamp = '2026-08-20T08:00:00.000Z'

const product: Product = {
  id: 'parliament', category: 'cigarette', name: 'Parliament', active: true,
  packagePriceMinor: 11_000, unitsPerPackage: 20, createdAt: timestamp, updatedAt: timestamp,
}

function event(id: string, occurredAt: string): ConsumptionEvent {
  return { id, productId: product.id, category: 'cigarette', quantity: 1, occurredAt, createdAt: timestamp, updatedAt: timestamp }
}

function craving(id: string, occurredAt: string): CravingEvent {
  return { id, tagId: 'addiction', occurredAt, createdAt: occurredAt, updatedAt: occurredAt }
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
    await saveCraving(craving('local-craving', '2026-08-20T07:00:00.000Z'))
    await importBackup({
      products: [product],
      events: [event('imported', timestamp)],
      cravings: [craving('imported-craving', '2026-08-20T09:00:00.000Z')],
    })

    expect((await listProducts({ includeInactive: true }).then((items) => items.map((item) => item.id)))).toEqual(['local', 'parliament'])
    expect((await listEvents()).map((item) => item.id)).toEqual(['imported'])
    expect((await listCravings()).map((item) => item.id)).toEqual(['imported-craving', 'local-craving'])
  })

  test('saves unresolved cravings newest first and deletes only the selected craving', async () => {
    await saveCraving(craving('older', '2026-08-20T08:00:00.000Z'))
    await saveCraving(craving('newer', '2026-08-20T10:00:00.000Z'))

    expect((await listCravings()).map((item) => item.id)).toEqual(['newer', 'older'])
    expect((await listCravings())[0].outcome).toBeUndefined()

    await deleteCraving('older')
    expect((await listCravings()).map((item) => item.id)).toEqual(['newer'])
  })

  test('upgrades a version-one database without changing existing products or events', async () => {
    const legacyDb = await openDB('nicotine-tracker', 1, {
      upgrade(db) {
        db.createObjectStore('products', { keyPath: 'id' })
        const events = db.createObjectStore('events', { keyPath: 'id' })
        events.createIndex('by-occurred-at', 'occurredAt')
        events.createIndex('by-product-id', 'productId')
      },
    })
    await legacyDb.put('products', product)
    await legacyDb.put('events', event('legacy-event', timestamp))
    legacyDb.close()

    expect((await listProducts({ includeInactive: true })).map((item) => item.id)).toEqual(['parliament'])
    expect((await listEvents()).map((item) => item.id)).toEqual(['legacy-event'])
    expect(await listCravings()).toEqual([])
  })
})
