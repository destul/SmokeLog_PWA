// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import App from '../App'
import { resetDatabaseForTests } from '../storage/db'

describe('App', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    await resetDatabaseForTests()
  })

  test('renders the daily tracker heading', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Сьогодні' })).toBeTruthy()
    expect(screen.getByText('З останнього разу')).toBeTruthy()
    expect(screen.getByText('Ще немає записів.')).toBeTruthy()
  })

  test('saves a selected tag and exposes it in week analytics', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Назва продукту'), 'Parliament')
    await user.clear(screen.getByLabelText('Ціна пачки'))
    await user.type(screen.getByLabelText('Ціна пачки'), '110')
    await user.click(screen.getByRole('button', { name: 'Зберегти продукт' }))
    await user.click(await screen.findByRole('button', { name: 'Додати запис' }))
    await user.selectOptions(screen.getByLabelText('Причина / ситуація'), 'coffee')
    await user.click(screen.getByRole('button', { name: 'Зберегти запис' }))

    expect(await screen.findByText('☕ Кава')).toBeTruthy()
    await user.click(screen.getByRole('tab', { name: 'Тиждень' }))
    expect(await screen.findAllByTestId('week-bar')).toHaveLength(7)
    expect(screen.getByTestId('hour-0')).toBeTruthy()
    expect(screen.getByText('☕ Кава')).toBeTruthy()
    expect(screen.getByText('· 1 шт.')).toBeTruthy()
  })

  test('adds a configured cigarette and updates today total', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Назва продукту'), 'Parliament')
    await user.clear(screen.getByLabelText('Ціна пачки'))
    await user.type(screen.getByLabelText('Ціна пачки'), '110')
    await user.click(screen.getByRole('button', { name: 'Зберегти продукт' }))
    await user.click(await screen.findByRole('button', { name: 'Додати 1 сигарету' }))

    expect(await screen.findByText('1 шт.')).toBeTruthy()
    expect(screen.getByText('5,50 ₴')).toBeTruthy()
  })

  test('configures vape without a package price and records puffs separately', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Категорія'), 'vape')
    await user.type(screen.getByLabelText('Назва продукту'), 'Одноразка')
    expect(screen.queryByLabelText('Ціна пачки')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Зберегти продукт' }))
    await user.click(await screen.findByRole('button', { name: 'Додати затяжки' }))

    expect(await screen.findByText(/1\s+затяжка/)).toBeTruthy()
    expect(screen.getByText('0,00 ₴')).toBeTruthy()
  })

  test('edits a journal entry to a historical date and can delete it', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Назва продукту'), 'Parliament')
    await user.clear(screen.getByLabelText('Ціна пачки'))
    await user.type(screen.getByLabelText('Ціна пачки'), '110')
    await user.click(screen.getByRole('button', { name: 'Зберегти продукт' }))
    await user.click(await screen.findByRole('button', { name: 'Додати 1 сигарету' }))

    await user.click(await screen.findByRole('button', { name: 'Редагувати Parliament' }))
    fireEvent.change(screen.getByLabelText('Дата й час'), { target: { value: '2026-08-19T09:30' } })
    await user.click(screen.getByRole('button', { name: 'Зберегти запис' }))

    expect(await screen.findByText('Ще нічого не додано.')).toBeTruthy()
    expect(screen.queryByRole('form', { name: 'Редактор запису' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Додати запис' }))
    expect((await screen.findAllByText(/19\.08\.26/)).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Видалити Parliament' }))
    await user.click(screen.getByRole('button', { name: 'Підтвердити видалення' }))
    expect(await screen.findByText('Запис видалено.')).toBeTruthy()
  })

  test('shows seven days of statistics including the current event', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Назва продукту'), 'Parliament')
    await user.clear(screen.getByLabelText('Ціна пачки'))
    await user.type(screen.getByLabelText('Ціна пачки'), '110')
    await user.click(screen.getByRole('button', { name: 'Зберегти продукт' }))
    await user.click(await screen.findByRole('button', { name: 'Додати 1 сигарету' }))
    await user.click(screen.getByRole('tab', { name: 'Тиждень' }))

    expect(await screen.findAllByTestId('week-day')).toHaveLength(7)
    expect(screen.getByText('Сигарети · 1 шт.')).toBeTruthy()
    expect(screen.getByText('5,50 ₴')).toBeTruthy()
  })

  test('hides a product in settings while keeping its journal event', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Назва продукту'), 'Parliament')
    await user.clear(screen.getByLabelText('Ціна пачки'))
    await user.type(screen.getByLabelText('Ціна пачки'), '110')
    await user.click(screen.getByRole('button', { name: 'Зберегти продукт' }))
    await user.click(await screen.findByRole('button', { name: 'Додати 1 сигарету' }))
    await user.click(screen.getByRole('tab', { name: 'Налаштування' }))
    await user.click(await screen.findByRole('button', { name: 'Приховати Parliament' }))

    expect(await screen.findByText('Приховано: Parliament')).toBeTruthy()
    await user.click(screen.getByRole('tab', { name: 'Сьогодні' }))
    expect(await screen.findByText('Parliament')).toBeTruthy()
  })

  test('offers a local JSON backup in settings', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: 'Налаштування' }))

    expect(screen.getByRole('button', { name: 'Експортувати JSON' })).toBeTruthy()
    expect(screen.getByLabelText('Імпортувати JSON')).toBeTruthy()
  })
})
