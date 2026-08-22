import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { PwaUpdatePrompt } from './pwa'

test('offers a quiet update action when a new PWA version is ready', () => {
  const onUpdate = vi.fn()
  const onDismiss = vi.fn()
  render(<PwaUpdatePrompt onUpdate={onUpdate} onDismiss={onDismiss} />)

  expect(screen.getByText('Доступна нова версія')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Оновити' }))
  fireEvent.click(screen.getByRole('button', { name: 'Пізніше' }))
  expect(onUpdate).toHaveBeenCalledOnce()
  expect(onDismiss).toHaveBeenCalledOnce()
})
