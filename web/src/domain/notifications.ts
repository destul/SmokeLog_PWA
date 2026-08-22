const REMINDER_MINUTES = 120

export function isQuietHour(hour: number, quietStart: number, quietEnd: number): boolean {
  if (quietStart === quietEnd) return false
  if (quietStart < quietEnd) return hour >= quietStart && hour < quietEnd
  return hour >= quietStart || hour < quietEnd
}

export function shouldSendPauseReminder(
  lastEventAt: string | undefined,
  now: Date,
  enabled: boolean,
  alreadySentForPause: boolean,
  quietStart = 22,
  quietEnd = 8,
): boolean {
  if (!enabled || alreadySentForPause || !lastEventAt) return false
  if (isQuietHour(now.getHours(), quietStart, quietEnd)) return false
  const elapsedMinutes = (now.getTime() - new Date(lastEventAt).getTime()) / 60_000
  return Number.isFinite(elapsedMinutes) && elapsedMinutes >= REMINDER_MINUTES
}
