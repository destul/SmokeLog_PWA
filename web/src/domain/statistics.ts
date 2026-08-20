import type { Category, ConsumptionEvent, Product } from './types'

type CategorySummary = {
  quantity: number
  costMinor: number
}

export type ConsumptionSummary = {
  quantity: number
  costMinor: number
  byCategory: Record<Category, CategorySummary>
}

const categories: Category[] = ['cigarette', 'stick', 'vape', 'snus']

function emptySummary(): ConsumptionSummary {
  return {
    quantity: 0,
    costMinor: 0,
    byCategory: Object.fromEntries(
      categories.map((category) => [category, { quantity: 0, costMinor: 0 }]),
    ) as Record<Category, CategorySummary>,
  }
}

function eventCostMinor(event: ConsumptionEvent, product: Product | undefined): number {
  if (!product || product.category === 'vape') {
    return 0
  }

  if (!product.packagePriceMinor || !product.unitsPerPackage) {
    return 0
  }

  return Math.round((event.quantity * product.packagePriceMinor) / product.unitsPerPackage)
}

export function summarizeEvents(
  events: ConsumptionEvent[],
  products: Map<string, Product>,
): ConsumptionSummary {
  return events.reduce<ConsumptionSummary>((summary, event) => {
    const costMinor = eventCostMinor(event, products.get(event.productId))
    const category = summary.byCategory[event.category]

    summary.quantity += event.quantity
    summary.costMinor += costMinor
    category.quantity += event.quantity
    category.costMinor += costMinor

    return summary
  }, emptySummary())
}
