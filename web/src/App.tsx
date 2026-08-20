import { useEffect, useMemo, useState } from 'react'

import { summarizeWeekAnalytics } from './domain/analytics'
import { localDayKey, sevenDayKeys } from './domain/dates'
import { formatElapsedSince } from './domain/elapsed'
import { summarizeEvents } from './domain/statistics'
import { eventTags } from './domain/tags'
import type { Category, ConsumptionEvent, Product } from './domain/types'
import { createBackup, parseBackup } from './storage/backup'
import { deactivateProduct, deleteEvent, importBackup, listEvents, listProducts, saveEvent, saveProduct } from './storage/db'

const categoryLabels: Record<Category, string> = {
  cigarette: 'Сигарети',
  stick: 'IQOS / стіки',
  vape: 'Вейп',
  snus: 'Снюс',
}

function formatUah(minor: number): string {
  return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(minor / 100)
}

function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

function formatDay(key: string): string {
  return new Intl.DateTimeFormat('uk-UA', { weekday: 'short', day: 'numeric' }).format(new Date(`${key}T12:00:00`))
}

function tagLabel(tagId?: string): string | undefined {
  const tag = eventTags.find((item) => item.id === tagId)
  return tag ? `${tag.icon} ${tag.label}` : undefined
}

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [events, setEvents] = useState<ConsumptionEvent[]>([])
  const [tab, setTab] = useState<'today' | 'week' | 'settings'>('today')
  const [category, setCategory] = useState<Category>('cigarette')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [units, setUnits] = useState('20')
  const [editingEvent, setEditingEvent] = useState<ConsumptionEvent | null>(null)
  const [eventEditorOpen, setEventEditorOpen] = useState(false)
  const [eventProductId, setEventProductId] = useState('')
  const [eventQuantity, setEventQuantity] = useState('1')
  const [eventDate, setEventDate] = useState(() => toLocalInputValue(new Date().toISOString()))
  const [eventTagId, setEventTagId] = useState('')
  const [pendingDelete, setPendingDelete] = useState<ConsumptionEvent | null>(null)
  const [notice, setNotice] = useState('')
  const [showProductForm, setShowProductForm] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const isVape = category === 'vape'

  async function refresh() {
    const [nextProducts, nextEvents] = await Promise.all([listProducts({ includeInactive: true }), listEvents()])
    setProducts(nextProducts)
    setEvents(nextEvents)
  }

  useEffect(() => {
    let active = true
    void Promise.all([listProducts({ includeInactive: true }), listEvents()]).then(([nextProducts, nextEvents]) => {
      if (active) {
        setProducts(nextProducts)
        setEvents(nextEvents)
      }
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const activeProducts = useMemo(() => products.filter((product) => product.active), [products])
  const todayEvents = useMemo(
    () => events.filter((event) => localDayKey(new Date(event.occurredAt)) === localDayKey(now)),
    [events, now],
  )
  const summary = useMemo(() => summarizeEvents(todayEvents, productsById), [productsById, todayEvents])
  const weekKeys = useMemo(() => sevenDayKeys(now), [now])
  const weekEvents = useMemo(() => events.filter((event) => localDayKey(new Date(event.occurredAt)) >= weekKeys[0]), [events, weekKeys])
  const weekAnalytics = useMemo(() => summarizeWeekAnalytics(events, weekKeys), [events, weekKeys])
  const lastEvent = events[0]

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const packagePriceMinor = Math.round(Number(price) * 100)
    const unitsPerPackage = Number(units)
    if (!name.trim() || (!isVape && (!Number.isFinite(packagePriceMinor) || packagePriceMinor <= 0 || !Number.isInteger(unitsPerPackage) || unitsPerPackage <= 0))) return
    const createdAt = new Date().toISOString()
    await saveProduct({ id: crypto.randomUUID(), category, name: name.trim(), active: true, packagePriceMinor: isVape ? undefined : packagePriceMinor, unitsPerPackage: isVape ? undefined : unitsPerPackage, createdAt, updatedAt: createdAt })
    setName('')
    setPrice('')
    setShowProductForm(false)
    setNotice('Продукт збережено.')
    await refresh()
  }

  async function addOne(product: Product) {
    const createdAt = new Date().toISOString()
    await saveEvent({ id: crypto.randomUUID(), productId: product.id, category: product.category, quantity: 1, occurredAt: createdAt, createdAt, updatedAt: createdAt })
    await refresh()
  }

  function openNewEvent(product?: Product) {
    setEventEditorOpen(true)
    setEditingEvent(null)
    setEventProductId(product?.id ?? products[0]?.id ?? '')
    setEventQuantity(product?.category === 'vape' ? '' : '1')
    setEventDate(toLocalInputValue(new Date().toISOString()))
    setEventTagId('')
    setNotice('')
  }

  function openEditEvent(event: ConsumptionEvent) {
    setEventEditorOpen(true)
    setEditingEvent(event)
    setEventProductId(event.productId)
    setEventQuantity(String(event.quantity))
    setEventDate(toLocalInputValue(event.occurredAt))
    setEventTagId(event.tagId ?? '')
    setNotice('')
  }

  async function saveJournalEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const product = products.find((item) => item.id === eventProductId)
    const quantity = Number(eventQuantity)
    const occurredAt = new Date(eventDate)
    if (!product || !Number.isInteger(quantity) || quantity <= 0 || Number.isNaN(occurredAt.getTime())) return

    const updatedAt = new Date().toISOString()
    await saveEvent({
      id: editingEvent?.id ?? crypto.randomUUID(), productId: product.id, category: product.category, quantity,
      tagId: eventTagId || undefined, occurredAt: occurredAt.toISOString(),
      createdAt: editingEvent?.createdAt ?? updatedAt, updatedAt,
    })
    setEditingEvent(null)
    setEventEditorOpen(false)
    setNotice(editingEvent ? 'Запис змінено.' : 'Запис додано.')
    await refresh()
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    await deleteEvent(pendingDelete.id)
    setPendingDelete(null)
    setNotice('Запис видалено.')
    await refresh()
  }

  async function hideProduct(product: Product) {
    await deactivateProduct(product.id)
    setNotice(`Приховано: ${product.name}`)
    await refresh()
  }

  function exportJson() {
    const backup = createBackup(products, events)
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `smokelog-${backup.exportedAt.slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setNotice('Резервну копію завантажено.')
  }

  async function importJsonFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      await importBackup(backup)
      await refresh()
      setNotice(`Імпортовано: ${backup.events.length} записів.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не вдалося імпортувати резервну копію.')
    }
  }

  const maxDaily = Math.max(1, ...weekAnalytics.days.map((day) => day.quantity))
  const maxHourly = Math.max(1, ...weekAnalytics.hours)

  return (
    <main className="tracker">
      <header><p>Приватний облік · лише на цьому пристрої</p><h1>{tab === 'today' ? 'Сьогодні' : tab === 'week' ? 'Тиждень' : 'Налаштування'}</h1></header>
      <nav className="tabs" aria-label="Розділи"><button type="button" role="tab" aria-selected={tab === 'today'} onClick={() => setTab('today')}>Сьогодні</button><button type="button" role="tab" aria-selected={tab === 'week'} onClick={() => setTab('week')}>Тиждень</button><button type="button" role="tab" aria-selected={tab === 'settings'} onClick={() => setTab('settings')}>Налаштування</button></nav>
      {notice && <p role="status" className="notice">{notice}</p>}
      {tab === 'today' && <>
        <section className="interval-card"><span>З останнього разу</span>{lastEvent ? <><strong>{formatElapsedSince(lastEvent.occurredAt, now)}</strong><small>{formatEventDate(lastEvent.occurredAt)}</small></> : <strong>Ще немає записів.</strong>}</section>
        <section className="total" aria-label="Підсумок за сьогодні"><strong>{summary.quantity} шт.</strong><span>{formatUah(summary.costMinor)}</span></section>
        {activeProducts.length === 0 || showProductForm ? (
          <form onSubmit={addProduct} className="product-form">
            <h2>{activeProducts.length === 0 ? 'Додай перший продукт' : 'Новий продукт'}</h2>
            <label>Категорія<select value={category} onChange={(event) => setCategory(event.target.value as Category)}>{Object.entries(categoryLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
            <label>Назва продукту<input value={name} onChange={(event) => setName(event.target.value)} /></label>
            {!isVape && <><label>Ціна пачки<input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label>Штук у пачці<input inputMode="numeric" value={units} onChange={(event) => setUnits(event.target.value)} /></label></>}
            <button type="submit">Зберегти продукт</button>{activeProducts.length > 0 && <button type="button" className="text-button" onClick={() => setShowProductForm(false)}>Скасувати</button>}
          </form>
        ) : <section><div className="section-heading"><h2>Додати</h2><button type="button" className="text-button" onClick={() => openNewEvent()}>Додати запис</button></div><div className="actions">{activeProducts.map((product) => <button key={product.id} type="button" onClick={() => void addOne(product)}>{product.category === 'vape' ? 'Додати затяжки' : `Додати 1 ${product.category === 'stick' ? 'стік' : product.category === 'snus' ? 'порцію' : 'сигарету'}`}</button>)}</div></section>}
        {activeProducts.length > 0 && eventEditorOpen && <form className="event-form" onSubmit={saveJournalEvent} aria-label="Редактор запису">
          <h2>{editingEvent ? 'Редагувати запис' : 'Новий запис'}</h2>
          <label>Продукт<select value={eventProductId} onChange={(event) => setEventProductId(event.target.value)}>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label>Кількість<input inputMode="numeric" value={eventQuantity} onChange={(event) => setEventQuantity(event.target.value)} /></label>
          <label>Дата й час<input type="datetime-local" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>
          <label>Причина / ситуація<select value={eventTagId} onChange={(event) => setEventTagId(event.target.value)}><option value="">Без тегу</option>{eventTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.icon} {tag.label}</option>)}</select></label>
          <div className="form-actions"><button type="submit">Зберегти запис</button><button type="button" className="text-button" onClick={() => { setEditingEvent(null); setEventProductId(''); setEventEditorOpen(false) }}>Скасувати</button></div>
        </form>}
        <section><h2>Останні записи</h2>{todayEvents.length === 0 ? <p>Ще нічого не додано.</p> : null}{events.length === 0 ? <p>Журнал порожній.</p> : <ul className="event-list">{events.map((event) => {
          const product = productsById.get(event.productId)
          const productName = product?.name ?? 'Прихований продукт'
          const label = tagLabel(event.tagId)
          return <li key={event.id}><div><strong>{productName}</strong><span>{event.quantity} {event.category === 'vape' ? 'затяжка' : 'шт.'} · {formatEventDate(event.occurredAt)}</span>{label && <em className="event-tag">{label}</em>}</div><div className="event-actions"><button type="button" className="text-button" aria-label={`Редагувати ${productName}`} onClick={() => openEditEvent(event)}>Редагувати</button><button type="button" className="danger-button" aria-label={`Видалити ${productName}`} onClick={() => setPendingDelete(event)}>Видалити</button></div></li>
        })}</ul>}</section>
      </>}
      {tab === 'week' && <section className="week-card"><h2>Останні 7 днів</h2><div className="bar-chart" aria-label="Споживання за днями">{weekAnalytics.days.map((day) => <div className="bar-column" data-testid="week-bar" key={day.key}><span>{day.quantity || ''}</span><i style={{ height: `${(day.quantity / maxDaily) * 100}%` }} /><small>{formatDay(day.key)}</small></div>)}</div><div className="week-list">{weekAnalytics.days.map((day) => {
        const daySummary = summarizeEvents(events.filter((event) => localDayKey(new Date(event.occurredAt)) === day.key), productsById)
        return <div className="week-day" data-testid="week-day" key={day.key}><span>{formatDay(day.key)}</span><strong>{daySummary.quantity} шт.</strong><span>{formatUah(daySummary.costMinor)}</span></div>
      })}</div><h2 className="subheading">По годинах</h2><div className="hour-chart">{weekAnalytics.hours.map((quantity, hour) => <div key={hour} data-testid={`hour-${hour}`} className={`hour-cell level-${Math.ceil((quantity / maxHourly) * 3)}`}><span>{hour}</span><b>{quantity || ''}</b></div>)}</div><h2 className="subheading">Причини / ситуації</h2>{weekAnalytics.tags.length === 0 ? <p className="muted">Ще немає тегів.</p> : <ul className="tag-totals">{weekAnalytics.tags.map((tag) => <li key={tag.id}>{tagLabel(tag.id) ?? 'Без тегу'} <strong>· {tag.quantity} шт.</strong></li>)}</ul>}<div className="category-breakdown">{(Object.keys(categoryLabels) as Category[]).map((item) => <p key={item}>{categoryLabels[item]} · {summarizeEvents(weekEvents, productsById).byCategory[item].quantity} шт.</p>)}</div></section>}
      {tab === 'settings' && <section className="settings-card"><div className="section-heading"><h2>Мої продукти</h2><button type="button" onClick={() => { setTab('today'); setShowProductForm(true) }}>Додати продукт</button></div>{products.length === 0 ? <p>Поки що немає продуктів.</p> : <ul className="product-list">{products.map((product) => <li key={product.id}><div><strong>{product.name}</strong><span>{categoryLabels[product.category]}{product.packagePriceMinor ? ` · ${formatUah(product.packagePriceMinor)} / ${product.unitsPerPackage} шт.` : ' · затяжки'}</span></div>{product.active ? <button type="button" className="text-button" aria-label={`Приховати ${product.name}`} onClick={() => void hideProduct(product)}>Приховати</button> : <span className="hidden-product">Приховано</span>}</li>)}</ul>}<section className="backup-card"><h2>Резервна копія</h2><p>Файл зберігає все тільки у тебе. Імпорт не стирає поточні записи.</p><button type="button" onClick={exportJson}>Експортувати JSON</button><label className="import-label">Імпортувати JSON<input type="file" accept="application/json,.json" onChange={(event) => void importJsonFile(event)} /></label></section><p className="settings-note">Прихований продукт не зникає з журналу і не стирає твою статистику.</p></section>}
      {pendingDelete && <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-label="Підтвердження видалення"><h2>Видалити запис?</h2><p>Його не можна буде повернути.</p><div className="form-actions"><button type="button" className="danger-button" onClick={() => void confirmDelete()}>Підтвердити видалення</button><button type="button" className="text-button" onClick={() => setPendingDelete(null)}>Скасувати</button></div></section></div>}
    </main>
  )
}

export default App
