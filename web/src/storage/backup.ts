import { isEventTagId, isTriggerTagId } from '../domain/tags'
import type {
  Category,
  ConsumptionEvent,
  CravingEvent,
  CravingOutcome,
  Product,
  SnusKind,
} from '../domain/types'

const categories: Category[] = ['cigarette', 'stick', 'vape', 'snus']

export type TrackerBackup = {
  version: 2
  exportedAt: string
  products: Product[]
  events: ConsumptionEvent[]
  cravings: CravingEvent[]
}

export function createBackup(
  products: readonly Product[],
  events: readonly ConsumptionEvent[],
  cravings: readonly CravingEvent[] = [],
  exportedAt = new Date().toISOString(),
): TrackerBackup {
  return {
    version: 2,
    exportedAt,
    products: [...products],
    events: [...events],
    cravings: [...cravings],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
}

function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && categories.includes(value as Category)
}

function isSnusKind(value: unknown): value is SnusKind {
  return value === 'tobacco' || value === 'nicotine-pouch'
}

function isCravingOutcome(value: unknown): value is CravingOutcome {
  return value === 'smoked' || value === 'resisted'
}

function isProduct(value: unknown): value is Product {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string' || !value.name || !isCategory(value.category) || typeof value.active !== 'boolean' || !isIsoDate(value.createdAt) || !isIsoDate(value.updatedAt)) return false
  if (value.snusKind !== undefined && (value.category !== 'snus' || !isSnusKind(value.snusKind))) return false
  if (value.category === 'vape') return value.packagePriceMinor === undefined && value.unitsPerPackage === undefined
  return Number.isInteger(value.packagePriceMinor) && (value.packagePriceMinor as number) > 0 && Number.isInteger(value.unitsPerPackage) && (value.unitsPerPackage as number) > 0
}

function isEvent(value: unknown): value is ConsumptionEvent {
  return isRecord(value) && typeof value.id === 'string' && !!value.id && typeof value.productId === 'string' && !!value.productId && isCategory(value.category) && Number.isInteger(value.quantity) && (value.quantity as number) > 0 && (value.tagId === undefined || isEventTagId(value.tagId)) && isIsoDate(value.occurredAt) && isIsoDate(value.createdAt) && isIsoDate(value.updatedAt)
}

function normalizeCraving(value: unknown): CravingEvent | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !value.id ||
    !isTriggerTagId(value.tagId) ||
    (value.outcome !== undefined && !isCravingOutcome(value.outcome)) ||
    !isIsoDate(value.occurredAt) ||
    (value.resolvedAt !== undefined && !isIsoDate(value.resolvedAt)) ||
    !isIsoDate(value.createdAt) ||
    !isIsoDate(value.updatedAt)
  ) {
    return null
  }

  let customReason: string | undefined
  if (value.customReason !== undefined) {
    if (typeof value.customReason !== 'string') return null
    const trimmedReason = value.customReason.trim()
    if (trimmedReason.length > 120) return null
    customReason = trimmedReason || undefined
  }

  return {
    id: value.id,
    tagId: value.tagId,
    ...(customReason ? { customReason } : {}),
    ...(value.outcome ? { outcome: value.outcome } : {}),
    occurredAt: value.occurredAt,
    ...(value.resolvedAt ? { resolvedAt: value.resolvedAt } : {}),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

export function parseBackup(serialized: string): TrackerBackup {
  let value: unknown
  try {
    value = JSON.parse(serialized)
  } catch {
    throw new Error('Не вдалося прочитати резервну копію.')
  }

  if (!isRecord(value) || (value.version !== 1 && value.version !== 2)) throw new Error('Непідтримуваний формат резервної копії.')
  if (!isIsoDate(value.exportedAt) || !Array.isArray(value.products) || !Array.isArray(value.events) || !value.products.every(isProduct) || !value.events.every(isEvent)) {
    throw new Error('Резервна копія містить некоректні дані.')
  }

  const cravings = value.version === 1 ? [] : value.cravings
  if (!Array.isArray(cravings)) throw new Error('Резервна копія містить некоректні дані.')
  const normalizedCravings = cravings.map(normalizeCraving)
  if (normalizedCravings.some((craving) => craving === null)) {
    throw new Error('Резервна копія містить некоректні дані.')
  }

  const productIds = new Set(value.products.map((product) => product.id))
  if (value.events.some((event) => !productIds.has(event.productId))) throw new Error('Продукт для запису не знайдено.')

  return {
    version: 2,
    exportedAt: value.exportedAt,
    products: value.products,
    events: value.events,
    cravings: normalizedCravings as CravingEvent[],
  }
}
