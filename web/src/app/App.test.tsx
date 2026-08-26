// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import App from '../App'
import { listEvents, listProducts, resetDatabaseForTests, saveCraving, saveEvent, saveProduct } from '../storage/db'
import type { Category, ConsumptionEvent, CravingEvent, Product } from '../domain/types'

function savedProduct(
  id: string,
  overrides: Partial<Product> = {},
): Product {
  const timestamp = '2026-08-20T08:00:00.000Z'
  return {
    id,
    category: 'cigarette',
    name: id,
    active: true,
    packagePriceMinor: 11_000,
    unitsPerPackage: 20,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  }
}

function savedEvent(
  id: string,
  productId: string,
  category: Category,
  occurredAt: string,
): ConsumptionEvent {
  return {
    id,
    productId,
    category,
    quantity: 1,
    occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  }
}

function savedCraving(
  id: string,
  occurredAt: string,
  tagId: 'coffee' | 'addiction' = 'coffee',
): CravingEvent {
  return {
    id,
    tagId,
    occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  }
}

async function seedSevenDays(product: Product): Promise<void> {
  await saveProduct(product)
  const today = new Date()
  for (let offset = 6; offset >= 0; offset -= 1) {
    const occurredAt = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - offset,
      8,
      0,
    ).toISOString()
    await saveEvent(savedEvent(`event-${offset}`, product.id, product.category, occurredAt))
  }
}

describe('App', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    await resetDatabaseForTests()
    localStorage.clear()
  })

  test('renders the daily tracker heading', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Сьогодні' })).toBeTruthy()
    expect(screen.getByText('З останнього разу')).toBeTruthy()
    expect(screen.getByText('Ще немає записів.')).toBeTruthy()
  })

  test('shows only the latest twenty journal items until the full list is requested', async () => {
    const user = userEvent.setup()
    await saveProduct(savedProduct('Parliament'))
    await saveProduct(savedProduct('Oldest'))
    for (let index = 0; index < 20; index += 1) {
      const occurredAt = new Date(Date.now() - index * 60_000).toISOString()
      await saveEvent(savedEvent(`recent-${index}`, 'Parliament', 'cigarette', occurredAt))
    }
    await saveEvent(savedEvent('oldest', 'Oldest', 'cigarette', '2020-01-01T00:00:00.000Z'))

    render(<App />)

    expect(await screen.findAllByRole('button', { name: 'Редагувати Parliament' })).toHaveLength(20)
    expect(await screen.findByRole('button', { name: 'Показати всі' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Редагувати Oldest' })).toBeNull()

    await user.click(await screen.findByRole('button', { name: 'Показати всі' }))

    expect(screen.getByRole('button', { name: 'Редагувати Oldest' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Показати менше' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Показати менше' }))
    expect(screen.queryByRole('button', { name: 'Редагувати Oldest' })).toBeNull()
  })

  test('filters the expanded journal and groups it by local day', async () => {
    const parliament = savedProduct('Parliament')
    const terea = savedProduct('Terea', { category: 'stick' })
    await saveProduct(parliament)
    await saveProduct(terea)
    const now = new Date()
    for (let index = 0; index < 19; index += 1) {
      await saveEvent(savedEvent(`today-${index}`, parliament.id, parliament.category, new Date(now.getTime() - index * 60_000).toISOString()))
    }
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 20, 0).toISOString()
    await saveEvent(savedEvent('yesterday-1', terea.id, terea.category, yesterday))
    await saveEvent(savedEvent('yesterday-2', terea.id, terea.category, new Date(new Date(yesterday).getTime() - 60_000).toISOString()))
    await saveEvent(savedEvent('yesterday-3', terea.id, terea.category, new Date(new Date(yesterday).getTime() - 120_000).toISOString()))
    await saveCraving(savedCraving('craving-1', new Date(now.getTime() - 30_000).toISOString()))

    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Показати всі' }))

    expect(screen.getByText('Вчора')).toBeTruthy()
    expect(screen.getByTestId('journal-summary')).toHaveTextContent('3')
    await user.type(screen.getByLabelText('Пошук у журналі'), 'Terea')

    expect(screen.getAllByRole('button', { name: 'Редагувати Terea' })).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Редагувати Parliament' })).toBeNull()
  })

  test('undoes a confirmed deletion without changing other records', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Назва продукту'), 'Parliament')
    await user.clear(screen.getByLabelText('Ціна пачки'))
    await user.type(screen.getByLabelText('Ціна пачки'), '110')
    await user.click(screen.getByRole('button', { name: 'Зберегти продукт' }))
    await user.click(await screen.findByRole('button', { name: /Parliament · \+1 сигарету/ }))
    await user.click(await screen.findByRole('button', { name: 'Видалити Parliament' }))
    await user.click(screen.getByRole('button', { name: 'Підтвердити видалення' }))
    await user.click(await screen.findByRole('button', { name: 'Скасувати' }))

    expect(await screen.findByRole('button', { name: 'Редагувати Parliament' })).toBeTruthy()
  })

  test('undoes an accidental quick product addition', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Назва продукту'), 'Parliament')
    await user.clear(screen.getByLabelText('Ціна пачки'))
    await user.type(screen.getByLabelText('Ціна пачки'), '110')
    await user.click(screen.getByRole('button', { name: 'Зберегти продукт' }))
    await user.click(await screen.findByRole('button', { name: /Parliament · \+1 сигарету/ }))
    await user.click(screen.getByRole('button', { name: 'Скасувати' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Редагувати Parliament' })).toBeNull())
    expect(screen.getByText('0 шт.')).toBeTruthy()
  })

  test('opens a safe historical-entry editor from the expanded journal', async () => {
    const product = savedProduct('Parliament')
    await saveProduct(product)
    for (let index = 0; index < 21; index += 1) {
      await saveEvent(savedEvent(`event-${index}`, product.id, product.category, new Date(Date.now() - index * 60_000).toISOString()))
    }

    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Показати всі' }))
    await user.click(screen.getByRole('button', { name: 'Додати попередню' }))

    expect(screen.getByRole('form', { name: 'Редактор запису' })).toBeTruthy()
    expect(screen.getByLabelText('Дата й час')).toBeTruthy()
  })

  test('shows the author and version at the bottom of settings', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Налаштування' }))

    expect(screen.getByText('SmokeLog')).toBeTruthy()
    expect(screen.getByText('Версія 0.3.1')).toBeTruthy()
    expect(screen.getByText('Створено Віталієм за допомогою Codex')).toBeTruthy()
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
    await user.click(await screen.findByRole('button', { name: /Parliament · \+1 сигарету/ }))

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
    await user.click(await screen.findByRole('button', { name: /Одноразка · \+1 затяжку/ }))

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
    await user.click(await screen.findByRole('button', { name: /Parliament · \+1 сигарету/ }))

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
    await user.click(await screen.findByRole('button', { name: /Parliament · \+1 сигарету/ }))
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
    await user.click(await screen.findByRole('button', { name: /Parliament · \+1 сигарету/ }))
    await user.click(screen.getByRole('tab', { name: 'Налаштування' }))
    await user.click(await screen.findByRole('button', { name: 'Змінити Parliament' }))
    await user.click(await screen.findByRole('button', { name: 'Приховати Parliament' }))

    expect(await screen.findByText('Приховано: Parliament')).toBeTruthy()
    await user.click(screen.getByRole('tab', { name: 'Сьогодні' }))
    expect(await screen.findByText('Parliament')).toBeTruthy()
  })

  test('restores a hidden product from the unified change menu without changing its history', async () => {
    const product = savedProduct('Parliament')
    await saveProduct(product)
    await saveEvent(savedEvent('event-1', product.id, product.category, new Date().toISOString()))

    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Налаштування' }))
    await user.click(await screen.findByRole('button', { name: 'Змінити Parliament' }))
    await user.click(await screen.findByRole('button', { name: 'Приховати Parliament' }))

    expect(await screen.findByText('Приховано: Parliament')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Змінити Parliament' }))
    await user.click(screen.getByRole('button', { name: 'Показати Parliament' }))

    expect(await screen.findByText('Продукт показано.')).toBeTruthy()
    expect((await listProducts({ includeInactive: true })).find((item) => item.id === product.id)).toMatchObject({
      id: product.id,
      active: true,
    })
    await user.click(screen.getByRole('tab', { name: 'Сьогодні' }))
    expect(await screen.findByRole('button', { name: /Parliament · \+1 сигарету/ })).toBeTruthy()
    expect(await listEvents()).toHaveLength(1)
  })

  test('offers a local JSON backup in settings', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: 'Налаштування' }))

    expect(screen.getByRole('button', { name: 'Експортувати JSON' })).toBeTruthy()
    expect(screen.getByLabelText('Імпортувати JSON')).toBeTruthy()
  })

  test('shows no more than three named quick product buttons and opens all products', async () => {
    const products = [
      savedProduct('LM синій'),
      savedProduct('LM 100 мм'),
      savedProduct('HEETS Bronze', { category: 'stick' }),
      savedProduct('Parliament'),
    ]
    for (const [index, product] of products.entries()) {
      await saveProduct(product)
      await saveEvent(
        savedEvent(
          `event-${index}`,
          product.id,
          product.category,
          new Date(Date.now() - index * 60_000).toISOString(),
        ),
      )
    }

    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findAllByTestId('quick-product')).toHaveLength(3)
    expect(screen.getByRole('button', { name: /LM синій · \+1 сигарету/ })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Усі продукти' }))
    expect(screen.getByRole('dialog', { name: 'Усі продукти' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Parliament · \+1 сигарету/ })).toBeTruthy()
  })

  test('records a craving without changing consumption and resolves it as resisted', async () => {
    await saveProduct(savedProduct('Parliament'))
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Тягне курити' }))
    await user.click(screen.getByRole('button', { name: 'Просто тягне / залежність' }))

    expect(await screen.findByText('Тягу записано.')).toBeTruthy()
    expect(screen.getByText('0 шт.')).toBeTruthy()
    await user.click(await screen.findByRole('button', { name: 'Переждав' }))
    expect(await screen.findByText('Переждав')).toBeTruthy()
  })

  test('records a consumption event at the craving time after smoked outcome', async () => {
    await saveProduct(savedProduct('Parliament'))
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Тягне курити' }))
    await user.click(screen.getByRole('button', { name: 'Просто тягне / залежність' }))
    await user.click(await screen.findByRole('button', { name: 'Закурив' }))
    await user.click(await screen.findByRole('button', { name: 'Записати Parliament' }))

    expect(await screen.findByText('Тягу записано як куріння.')).toBeTruthy()
    expect(screen.getByText('1 шт.')).toBeTruthy()
    expect(screen.getByText('Закурив')).toBeTruthy()
  })

  test('shows only the selected local day in the hourly chart', async () => {
    const product = savedProduct('Parliament')
    await saveProduct(product)
    const today = new Date()
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 0).toISOString()
    const todayMorning = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0).toISOString()
    await saveEvent(savedEvent('yesterday', product.id, product.category, yesterday))
    await saveEvent(savedEvent('today', product.id, product.category, todayMorning))

    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Тиждень' }))

    expect(screen.getByTestId('hour-23').querySelector('b')).toHaveTextContent('')
    expect(screen.getByTestId('hour-9').querySelector('b')).toHaveTextContent('1')
  })

  test('configures a savings goal and notification quiet hours in settings', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Налаштування' }))

    await user.type(screen.getByLabelText('Ціль на заощадження, ₴'), '5000')
    await user.click(screen.getByRole('button', { name: 'Зберегти ціль' }))
    await user.selectOptions(screen.getByLabelText('Тихі години від'), '23')
    await user.selectOptions(screen.getByLabelText('до'), '7')

    expect(await screen.findByText('Поточна ціль: 5 000,00 ₴')).toBeTruthy()
    expect(screen.getByLabelText('М’які нагадування після 2 годин')).toBeChecked()
  })

  test('edits product price and keeps the previous price in history', async () => {
    await saveProduct(savedProduct('Parliament'))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Налаштування' }))
    await user.click(screen.getByRole('button', { name: 'Змінити Parliament' }))
    await user.click(screen.getByRole('button', { name: 'Змінити ціну' }))
    await user.clear(screen.getByLabelText('Ціна пачки'))
    await user.type(screen.getByLabelText('Ціна пачки'), '120')
    await user.click(screen.getByRole('button', { name: 'Зберегти зміни' }))
    await user.click(screen.getByRole('tab', { name: 'Налаштування' }))

    expect(await screen.findByText('Історія цін')).toBeTruthy()
    await user.click(screen.getByText('Історія цін'))
    expect(screen.getByText(/110,00 ₴/)).toBeTruthy()
    expect(screen.getAllByText(/120,00 ₴/).length).toBeGreaterThanOrEqual(1)
  })

  test('shows a month or quarter forecast and the seven-minute estimate after seven days', async () => {
    await seedSevenDays(savedProduct('Parliament'))
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByTestId('money-forecast')).toHaveTextContent('За такого темпу')
    expect(screen.getByText('Оцінка: 7 хв на сигарету або стік.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Квартал' }))
    expect(screen.getByTestId('money-forecast')).toHaveTextContent('90 днів')
  })

  test('shows an unavailable forecast before seven observed days', async () => {
    await saveProduct(savedProduct('Parliament'))
    render(<App />)

    expect(
      await screen.findByText('Прогноз з’явиться після 7 днів обліку.'),
    ).toBeTruthy()
  })

  test('opens product-specific health details with a source link', async () => {
    await saveProduct(savedProduct('Старий снюс', { category: 'snus' }))
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Про здоров’я' }))

    const dialog = screen.getByRole('dialog', { name: 'Про здоров’я' })
    expect(dialog).toHaveTextContent('Нікотин і залежність')
    expect(dialog).not.toHaveTextContent('спричиняють рак')
    expect(screen.getByRole('link', { name: 'Джерело' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/www\.cdc\.gov\//))
  })
})
