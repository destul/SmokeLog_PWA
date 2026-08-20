export function latestPastEvent<T extends { occurredAt: string }>(
  events: T[],
  now = new Date(),
): T | undefined {
  const nowMs = now.getTime()
  let latest: T | undefined
  let latestMs = Number.NEGATIVE_INFINITY

  for (const event of events) {
    const occurredAtMs = new Date(event.occurredAt).getTime()
    if (!Number.isFinite(occurredAtMs) || occurredAtMs > nowMs || occurredAtMs <= latestMs) continue
    latest = event
    latestMs = occurredAtMs
  }

  return latest
}

export function formatElapsedSince(occurredAt: string, now = new Date()): string {
  const then = new Date(occurredAt).getTime()
  const minutes = Math.max(0, Math.floor((now.getTime() - then) / 60_000))

  if (minutes < 60) return `${minutes} хв`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} год ${String(minutes % 60).padStart(2, '0')} хв`

  return `${Math.floor(hours / 24)} дн ${hours % 24} год`
}
