import { localDayKey } from './dates'
import type { ConsumptionEvent } from './types'

export type WeekAnalytics = {
  days: Array<{ key: string; quantity: number }>
  hours: number[]
  tags: Array<{ id: string; quantity: number }>
}

export function summarizeWeekAnalytics(events: ConsumptionEvent[], dayKeys: string[]): WeekAnalytics {
  const daily = new Map(dayKeys.map((key) => [key, 0]))
  const hours = Array.from({ length: 24 }, () => 0)
  const tags = new Map<string, number>()

  for (const event of events) {
    const occurredAt = new Date(event.occurredAt)
    const dayKey = localDayKey(occurredAt)
    if (!daily.has(dayKey)) continue

    daily.set(dayKey, (daily.get(dayKey) ?? 0) + event.quantity)
    hours[occurredAt.getHours()] += event.quantity
    const tagId = event.tagId ?? 'untagged'
    tags.set(tagId, (tags.get(tagId) ?? 0) + event.quantity)
  }

  return {
    days: dayKeys.map((key) => ({ key, quantity: daily.get(key) ?? 0 })),
    hours,
    tags: [...tags.entries()]
      .map(([id, quantity]) => ({ id, quantity }))
      .sort((left, right) => right.quantity - left.quantity || left.id.localeCompare(right.id)),
  }
}
