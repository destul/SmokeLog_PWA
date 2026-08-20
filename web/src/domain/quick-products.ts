import type { ConsumptionEvent, Product } from './types'

export function recentQuickProducts(
  products: Product[],
  events: ConsumptionEvent[],
): Product[] {
  const activeProducts = products.filter((product) => product.active)
  const activeById = new Map(activeProducts.map((product) => [product.id, product]))
  const selected: Product[] = []
  const selectedIds = new Set<string>()

  const newestEvents = [...events].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  )

  for (const event of newestEvents) {
    const product = activeById.get(event.productId)
    if (!product || selectedIds.has(product.id)) continue

    selected.push(product)
    selectedIds.add(product.id)
    if (selected.length === 3) return selected
  }

  const unusedProducts = activeProducts
    .filter((product) => !selectedIds.has(product.id))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))

  return [...selected, ...unusedProducts].slice(0, 3)
}
