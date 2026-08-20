export type Category = 'cigarette' | 'stick' | 'vape' | 'snus'

export type Product = {
  id: string
  category: Category
  name: string
  active: boolean
  packagePriceMinor?: number
  unitsPerPackage?: number
  createdAt: string
  updatedAt: string
}

export type ConsumptionEvent = {
  id: string
  productId: string
  category: Category
  quantity: number
  occurredAt: string
  createdAt: string
  updatedAt: string
}
