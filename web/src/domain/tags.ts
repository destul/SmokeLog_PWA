export const eventTags = [
  { id: 'coffee', label: 'Кава', icon: '☕' },
  { id: 'food', label: 'Після їжі', icon: '🍽️' },
  { id: 'work', label: 'Робота / пауза', icon: '💻' },
  { id: 'stress', label: 'Стрес / нерви', icon: '⚡' },
  { id: 'alcohol', label: 'Алкоголь / бар', icon: '🍺' },
  { id: 'road', label: 'Дорога / затор', icon: '🚗' },
  { id: 'social', label: 'Компанія', icon: '👥' },
  { id: 'boredom', label: 'Нудьга', icon: '⏳' },
  { id: 'night', label: 'Перед сном', icon: '🌙' },
] as const

export type EventTagId = (typeof eventTags)[number]['id']

export function isEventTagId(value: unknown): value is EventTagId {
  return typeof value === 'string' && eventTags.some((tag) => tag.id === value)
}
