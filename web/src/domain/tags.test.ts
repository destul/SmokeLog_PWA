import { describe, expect, test } from 'vitest'
import { isTriggerTagId, triggerTags } from './tags'

describe('trigger tags', () => {
  test('includes the explicit addiction trigger and rejects unknown tags', () => {
    expect(triggerTags[0]).toMatchObject({
      id: 'addiction',
      label: 'Просто тягне / залежність',
    })
    expect(isTriggerTagId('morning')).toBe(true)
    expect(isTriggerTagId('invented')).toBe(false)
  })
})
