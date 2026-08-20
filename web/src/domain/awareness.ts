import { localDayKey, sevenDayKeys } from './dates'
import { summarizeEvents } from './statistics'
import type { TriggerTagId } from './tags'
import type { ConsumptionEvent, CravingEvent, Product } from './types'

export type AwarenessForecast = {
  costMinor: number
  estimatedMinutes: number
  periodDays: 30 | 90
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
  periodDays: 30 | 90,
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
