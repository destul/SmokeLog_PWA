function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function sevenDayKeys(now: Date): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index))
    return localDayKey(day)
  })
}
