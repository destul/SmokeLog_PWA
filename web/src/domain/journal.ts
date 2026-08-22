import { localDayKey } from './dates'
import { triggerTags } from './tags'
import { type ConsumptionEvent, type CravingEvent, type Product } from './types'

export type JournalItem =
  | { kind: 'consumption'; occurredAt: string; event: ConsumptionEvent }
  | { kind: 'craving'; occurredAt: string; craving: CravingEvent }

export type JournalFilters = {
  search: string
  productId: string
  kind: 'all' | 'consumption' | 'craving'
  tagId: string
}

export type JournalSummary = {
  consumptionQuantity: number
  costMinor: number
  cravingCount: number
  longestPauseMinutes: number | null
}

export function filterJournalItems(
  items: JournalItem[],
  filters: JournalFilters,
  products: Map<string, Product>,
): JournalItem[] {
  const search = filters.search.trim().toLocaleLowerCase('uk')
  return items.filter((item) => {
    if (filters.kind !== 'all' && item.kind !== filters.kind) return false
    if (filters.tagId && (item.kind === 'consumption' ? item.event.tagId : item.craving.tagId) !== filters.tagId) return false
    if (filters.productId && (item.kind !== 'consumption' || item.event.productId !== filters.productId)) return false
    if (!search) return true

    if (item.kind === 'consumption') {
      return (products.get(item.event.productId)?.name ?? 'Прихований продукт').toLocaleLowerCase('uk').includes(search)
    }

    const tag = triggerTags.find((candidate) => candidate.id === item.craving.tagId)?.label ?? ''
    return `${tag} ${item.craving.customReason ?? ''}`.toLocaleLowerCase('uk').includes(search)
  })
}

export function journalDayLabel(iso: string, now: Date): string {
  const date = new Date(iso)
  const today = localDayKey(now)
  const yesterday = localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const day = localDayKey(date)
  if (day === today) return 'Сьогодні'
  if (day === yesterday) return 'Вчора'
  return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' }).format(date)
}

export function summarizeJournalItems(items: JournalItem[], products: Map<string, Product>): JournalSummary {
  const consumption = items
    .filter((item): item is Extract<JournalItem, { kind: 'consumption' }> => item.kind === 'consumption')
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
  let longestPauseMinutes: number | null = null
  for (let index = 1; index < consumption.length; index += 1) {
    const pause = Math.round((new Date(consumption[index].occurredAt).getTime() - new Date(consumption[index - 1].occurredAt).getTime()) / 60_000)
    longestPauseMinutes = Math.max(longestPauseMinutes ?? 0, pause)
  }
  return {
    consumptionQuantity: consumption.reduce((total, item) => total + item.event.quantity, 0),
    costMinor: consumption.reduce((total, item) => {
      const product = products.get(item.event.productId)
      if (!product?.packagePriceMinor || !product.unitsPerPackage || product.category === 'vape') return total
      return total + Math.round((item.event.quantity * product.packagePriceMinor) / product.unitsPerPackage)
    }, 0),
    cravingCount: items.filter((item) => item.kind === 'craving').length,
    longestPauseMinutes,
  }
}
