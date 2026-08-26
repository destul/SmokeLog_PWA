import { localDayKey } from './dates'
import { longestConsumptionPause } from './awareness'
import { summarizeEvents } from './statistics'
import type { ConsumptionEvent, Product } from './types'

export type AchievementSummary = { longestPauseMinutes: number; underGoalDays: number; savedMinor: number; returnedMinutes: number }

export function summarizeAchievements(events: ConsumptionEvent[], products: Map<string, Product>, now: Date, dailyGoal: number | null): AchievementSummary {
  const days = Array.from({ length: 30 }, (_, index) => localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - index)))
  const byDay = days.map((key) => events.filter((event) => localDayKey(new Date(event.occurredAt)) === key))
  const underGoalDays = dailyGoal === null ? 0 : byDay.filter((day) => day.length > 0 && day.reduce((sum, event) => sum + event.quantity, 0) <= dailyGoal).length
  const observed = byDay.flat()
  const actual = summarizeEvents(observed, products)
  const activeDays = byDay.filter((day) => day.length > 0).length
  const baselineDailyCost = activeDays ? Math.round(actual.costMinor / activeDays) : 0
  const savedMinor = Math.max(0, baselineDailyCost * activeDays - actual.costMinor)
  const units = observed.reduce((sum, event) => sum + ((event.category === 'cigarette' || event.category === 'stick') ? event.quantity : 0), 0)
  return { longestPauseMinutes: longestConsumptionPause(events)?.minutes ?? 0, underGoalDays, savedMinor, returnedMinutes: Math.max(0, Math.round(units * 7 * (underGoalDays / Math.max(1, activeDays)))) }
}
