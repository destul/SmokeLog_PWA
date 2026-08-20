import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type { ConsumptionEvent, CravingEvent, Product } from '../domain/types'

interface TrackerDb extends DBSchema {
  products: {
    key: string
    value: Product
  }
  events: {
    key: string
    value: ConsumptionEvent
    indexes: {
      'by-occurred-at': string
      'by-product-id': string
    }
  }
  cravings: {
    key: string
    value: CravingEvent
    indexes: {
      'by-occurred-at': string
    }
  }
}

let databasePromise: Promise<IDBPDatabase<TrackerDb>> | undefined

function database(): Promise<IDBPDatabase<TrackerDb>> {
  databasePromise ??= openDB<TrackerDb>('nicotine-tracker', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('products', { keyPath: 'id' })
        const events = db.createObjectStore('events', { keyPath: 'id' })
        events.createIndex('by-occurred-at', 'occurredAt')
        events.createIndex('by-product-id', 'productId')
      }
      if (oldVersion < 2) {
        const cravings = db.createObjectStore('cravings', { keyPath: 'id' })
        cravings.createIndex('by-occurred-at', 'occurredAt')
      }
    },
  })

  return databasePromise
}

export async function listProducts(options: { includeInactive?: boolean } = {}): Promise<Product[]> {
  const products = await (await database()).getAll('products')
  return products
    .filter((product) => options.includeInactive || product.active)
    .sort((left, right) => left.name.localeCompare(right.name, 'uk'))
}

export async function saveProduct(product: Product): Promise<void> {
  await (await database()).put('products', product)
}

export async function deactivateProduct(productId: string): Promise<void> {
  const db = await database()
  const product = await db.get('products', productId)
  if (!product) {
    throw new Error('Продукт не знайдено.')
  }

  await db.put('products', { ...product, active: false, updatedAt: new Date().toISOString() })
}

export async function listEvents(): Promise<ConsumptionEvent[]> {
  const events = await (await database()).getAll('events')
  return events.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
}

export async function saveEvent(event: ConsumptionEvent): Promise<void> {
  await (await database()).put('events', event)
}

export async function deleteEvent(eventId: string): Promise<void> {
  await (await database()).delete('events', eventId)
}

export async function listCravings(): Promise<CravingEvent[]> {
  const cravings = await (await database()).getAll('cravings')
  return cravings.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
}

export async function saveCraving(craving: CravingEvent): Promise<void> {
  await (await database()).put('cravings', craving)
}

export async function deleteCraving(cravingId: string): Promise<void> {
  await (await database()).delete('cravings', cravingId)
}

export async function importBackup(backup: {
  products: Product[]
  events: ConsumptionEvent[]
  cravings: CravingEvent[]
}): Promise<void> {
  const db = await database()
  const transaction = db.transaction(['products', 'events', 'cravings'], 'readwrite')
  await Promise.all([
    ...backup.products.map((product) => transaction.objectStore('products').put(product)),
    ...backup.events.map((event) => transaction.objectStore('events').put(event)),
    ...backup.cravings.map((craving) => transaction.objectStore('cravings').put(craving)),
    transaction.done,
  ])
}

export async function resetDatabaseForTests(): Promise<void> {
  if (databasePromise) {
    ;(await databasePromise).close()
    databasePromise = undefined
  }
  await deleteDB('nicotine-tracker')
}
