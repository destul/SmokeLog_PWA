import { localDayKey, sevenDayKeys } from './dates'
import { summarizeEvents } from './statistics'
import type { TriggerTagId } from './tags'
import type { ConsumptionEvent, CravingEvent, Product } from './types'

export type AwarenessForecast = {
  costMinor: number
  estimatedMinutes: number
  periodDays: 30 | 90 | 365
}

export type CravingSummary = {
  triggers: Array<{ tagId: TriggerTagId; count: number }>
  outcomes: {
    smoked: number
    resisted: number
    unresolved: number
  }
  byHour: number[]
}

export function forecastForPeriod(
  events: ConsumptionEvent[],
  products: Map<string, Product>,
  now: Date,
  periodDays: 30 | 90 | 365,
): AwarenessForecast | null {
  const observedDayKeys = sevenDayKeys(now)
  const observedDays = new Set(observedDayKeys)
  const recentEvents = events.filter((event) => {
    const occurredAt = new Date(event.occurredAt)
    return occurredAt <= now && observedDays.has(localDayKey(occurredAt))
  })
  const daysWithEvents = new Set(
    recentEvents.map((event) => localDayKey(new Date(event.occurredAt))),
  )

  if (observedDayKeys.some((dayKey) => !daysWithEvents.has(dayKey))) return null

  const weeklySummary = summarizeEvents(recentEvents, products)
  const weeklyTimedUnits = recentEvents.reduce((quantity, event) => {
    return event.category === 'cigarette' || event.category === 'stick'
      ? quantity + event.quantity
      : quantity
  }, 0)

  return {
    costMinor: Math.round((weeklySummary.costMinor * periodDays) / 7),
    estimatedMinutes: Math.round((weeklyTimedUnits * 7 * periodDays) / 7),
    periodDays,
  }
}

export function summarizeAwareness(
  cravings: CravingEvent[],
  dayKeys?: string[],
): CravingSummary {
  const allowedDays = dayKeys ? new Set(dayKeys) : undefined
  const relevantCravings = allowedDays
    ? cravings.filter((craving) =>
        allowedDays.has(localDayKey(new Date(craving.occurredAt))),
      )
    : cravings
  const triggerCounts = new Map<TriggerTagId, number>()
  const byHour = Array.from({ length: 24 }, () => 0)
  const outcomes = { smoked: 0, resisted: 0, unresolved: 0 }

  for (const craving of relevantCravings) {
    triggerCounts.set(craving.tagId, (triggerCounts.get(craving.tagId) ?? 0) + 1)
    byHour[new Date(craving.occurredAt).getHours()] += 1

    if (craving.outcome === 'smoked') outcomes.smoked += 1
    else if (craving.outcome === 'resisted') outcomes.resisted += 1
    else outcomes.unresolved += 1
  }

  const triggers = [...triggerCounts.entries()]
    .map(([tagId, count]) => ({ tagId, count }))
    .sort((left, right) => right.count - left.count || left.tagId.localeCompare(right.tagId))

  return { triggers, outcomes, byHour }
}

const contextualPrompts: Record<TriggerTagId, string> = {
  addiction: 'Тяга — це сигнал залежності, а не наказ діяти.',
  morning: 'Ранкова тяга — знайомий сценарій. Ти вже помітив його.',
  coffee: 'Кава може запускати звичний сценарій. Спостерігай без осуду.',
  food: 'Після їжі спрацьовує звичка. Цей момент уже став видимим.',
  work: 'Перерва потрібна тобі, навіть якщо сигарета не потрібна.',
  stress: 'Стрес реальний, але сигарета не зобов’язана бути відповіддю.',
  boredom: 'Нудьга мине. Тяга теж змінюється з часом.',
  alcohol: 'Алкоголь послаблює контроль — корисно, що ти помітив цей зв’язок.',
  road: 'Дорога запускає автоматичну звичку. Тепер вона не невидима.',
  social: 'Компанія впливає на вибір, але не приймає його замість тебе.',
  night: 'Вечірня тяга — частина звичного ритму, а не твоя провина.',
}

export function contextualPrompt(tagId: TriggerTagId): string {
  return contextualPrompts[tagId]
}

export type PauseSummary = {
  minutes: number
  from: string
  to: string
}

export function longestConsumptionPause(events: ConsumptionEvent[]): PauseSummary | null {
  const ordered = events
    .filter((event) => !Number.isNaN(new Date(event.occurredAt).getTime()))
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
  let longest: PauseSummary | null = null

  for (let index = 1; index < ordered.length; index += 1) {
    const from = ordered[index - 1].occurredAt
    const to = ordered[index].occurredAt
    const minutes = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000)
    if (!longest || minutes > longest.minutes) longest = { minutes, from, to }
  }

  return longest
}

export type SavingsProgress = {
  goalMinor: number
  savedMinor: number
  progressPercent: number
  baselineDailyCostMinor: number
}

export function savingsProgress(
  events: ConsumptionEvent[],
  products: Map<string, Product>,
  now: Date,
  goalMinor: number,
): SavingsProgress | null {
  const priorDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (index + 1))
    return localDayKey(date)
  })
  const priorDailyCosts = priorDays.map((dayKey) => summarizeEventsForDay(events, products, dayKey))
  if (priorDailyCosts.some((cost) => cost === 0)) return null

  const baselineDailyCostMinor = Math.round(
    priorDailyCosts.reduce((total, cost) => total + cost, 0) / priorDailyCosts.length,
  )
  const todayCostMinor = summarizeEventsForDay(events, products, localDayKey(now))
  const savedMinor = Math.max(0, baselineDailyCostMinor - todayCostMinor)
  return {
    goalMinor,
    savedMinor,
    progressPercent: goalMinor > 0 ? Math.min(100, Math.round((savedMinor / goalMinor) * 100)) : 0,
    baselineDailyCostMinor,
  }
}

function summarizeEventsForDay(
  events: ConsumptionEvent[],
  products: Map<string, Product>,
  dayKey: string,
): number {
  return events
    .filter((event) => localDayKey(new Date(event.occurredAt)) === dayKey)
    .reduce((total, event) => {
      const product = products.get(event.productId)
      if (!product?.packagePriceMinor || !product.unitsPerPackage) return total
      return total + Math.round((event.quantity * product.packagePriceMinor) / product.unitsPerPackage)
    }, 0)
}
