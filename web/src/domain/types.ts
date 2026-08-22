import type { TriggerTagId } from './tags'

export type Category = 'cigarette' | 'stick' | 'vape' | 'snus'
export type SnusKind = 'tobacco' | 'nicotine-pouch'
export type CravingOutcome = 'smoked' | 'resisted'

export type Product = {
  id: string
  category: Category
  name: string
  active: boolean
  packagePriceMinor?: number
  unitsPerPackage?: number
  snusKind?: SnusKind
  priceHistory?: readonly ProductPricePoint[]
  createdAt: string
  updatedAt: string
}

export type ProductPricePoint = {
  packagePriceMinor: number
  unitsPerPackage: number
  recordedAt: string
}

export type ConsumptionEvent = {
  id: string
  productId: string
  category: Category
  quantity: number
  tagId?: string
  occurredAt: string
  createdAt: string
  updatedAt: string
}

export type CravingEvent = {
  id: string
  tagId: TriggerTagId
  customReason?: string
  outcome?: CravingOutcome
  occurredAt: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}
