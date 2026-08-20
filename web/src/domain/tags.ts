export const triggerTags = [
  { id: 'addiction', label: 'Просто тягне / залежність', icon: '🫁' },
  { id: 'morning', label: 'Ранок', icon: '🌅' },
  { id: 'coffee', label: 'Кава', icon: '☕' },
  { id: 'food', label: 'Після їжі', icon: '🍽️' },
  { id: 'work', label: 'Робота / пауза', icon: '💻' },
  { id: 'stress', label: 'Стрес / тривога / злість', icon: '⚡' },
  { id: 'boredom', label: 'Нудьга', icon: '⏳' },
  { id: 'alcohol', label: 'Алкоголь / бар', icon: '🍺' },
  { id: 'road', label: 'Дорога / затор', icon: '🚗' },
  { id: 'social', label: 'Компанія', icon: '👥' },
  { id: 'night', label: 'Перед сном', icon: '🌙' },
] as const

export type TriggerTagId = (typeof triggerTags)[number]['id']

export function isTriggerTagId(value: unknown): value is TriggerTagId {
  return typeof value === 'string' && triggerTags.some((tag) => tag.id === value)
}

// Temporary compatibility aliases until the existing consumption UI moves to
// the shared trigger vocabulary in the awareness UI task.
export const eventTags = triggerTags
export type EventTagId = TriggerTagId
export const isEventTagId = isTriggerTagId
