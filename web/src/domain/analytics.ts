import { localDayKey } from './dates'
import type { ConsumptionEvent } from './types'

export type PeriodBar = { label: string; quantity: number }

export function summarizePeriodBars(events: ConsumptionEvent[], now: Date, periodDays: 30 | 90 | 365): PeriodBar[] {
  if (periodDays === 365) {
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1)
      const month = date.getMonth()
      const year = date.getFullYear()
      return { label: new Intl.DateTimeFormat('uk-UA', { month: 'short' }).format(date), quantity: events.filter((event) => { const occurred = new Date(event.occurredAt); return occurred.getFullYear() === year && occurred.getMonth() === month }).reduce((sum, event) => sum + event.quantity, 0) }
    })
  }
  const bucketCount = periodDays === 30 ? 6 : 9
  return Array.from({ length: bucketCount }, (_, index) => {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (bucketCount - 1 - index) * (periodDays === 30 ? 5 : 10))
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (periodDays === 30 ? 4 : 9))
    return { label: `${start.getDate()}.${start.getMonth() + 1}`, quantity: events.filter((event) => { const time = new Date(event.occurredAt).getTime(); return time >= start.getTime() && time <= new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).getTime() }).reduce((sum, event) => sum + event.quantity, 0) }
  })
}

export type WeekAnalytics = {
  days: Array<{ key: string; quantity: number }>
  hours: number[]
  tags: Array<{ id: string; quantity: number }>
}

export function summarizeDayHours(events: ConsumptionEvent[], dayKey: string): number[] {
  const hours = Array.from({ length: 24 }, () => 0)
  for (const event of events) {
    const occurredAt = new Date(event.occurredAt)
    if (localDayKey(occurredAt) === dayKey) hours[occurredAt.getHours()] += event.quantity
  }
  return hours
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
