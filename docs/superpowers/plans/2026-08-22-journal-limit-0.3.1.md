# SmokeLog 0.3.1 — журнал и удобство Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Сделать журнал компактным по умолчанию, но удобным для полного разбора: 20 последних записей на Today, раскрытие, фильтры, безопасные отмены и понятный служебный футер.

**Architecture:** Не менять IndexedDB, формат резервной копии и расчёты статистики. Оставить journalItems единым объединённым списком записей курения и тяги, отсортированным от новых к старым; UI будет выбирать первые 20 элементов в свернутом состоянии и весь список в раскрытом.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library.

**Spec:** docs/superpowers/specs/2026-08-20-awareness-design.md

## Global Constraints

- Версия релиза — ровно 0.3.1; до публикации приложения используем только 0.x.x.
- Интерфейс и новые подписи остаются на украинском языке.
- Лимит касается только отображения: записи, тяги, статистика, редактирование, удаление и JSON-бэкап не должны измениться.
- В свернутом виде показываются ровно последние 20 элементов объединённого журнала по occurredAt, включая записи курения и тяги.
- Кнопка «Показати всі» отображается только если элементов больше 20 и находится сразу под списком.
- Главный экран не должен получать дополнительные карточки, фильтры или настройки.
- Фильтры, поиск, группировка и сводка появляются только после раскрытия полного журнала.
- Все отмены и восстановление работают локально и не требуют нового формата IndexedDB или сервера.
- Автор и версия отображаются внизу раздела «Налаштування», а не занимают место на Today.

---

## File Structure

- web/src/App.tsx — состояние раскрытия журнала, выбор видимых элементов и кнопка под списком.
- web/src/app/App.test.tsx — приёмочные тесты лимита, раскрытия и сохранения действий записи.
- web/src/index.css — компактное оформление кнопки под журналом; не менять существующую мобильную раскладку записей.
- web/src/main.tsx — регистрация PWA-обновления, если для пользовательского prompt нужен явный обработчик.
- web/vite.config.ts — сохранить registerType: prompt и проверять поведение service worker без смены стратегии кэширования.
- web/package.json — версия приложения 0.3.1.
- web/package-lock.json — синхронизация версии lock-файла, если файл остаётся частью рабочей ветки.

## Task 1: Add regression coverage for the collapsed journal

**Files:**
- Modify: web/src/app/App.test.tsx

**Interfaces:**
- Consumes the existing product/event/craving persistence helpers and App UI.
- Produces stable acceptance coverage for the 20-item journal limit without changing storage behavior.

- [ ] **Step 1: Write the failing UI test for 21 records**

Create two products, save 20 recent records for Parliament and one older record for Oldest, render the app, and assert:

~~~
test('shows only the latest twenty journal items and offers the full list', async () => {
  const user = userEvent.setup()
  await saveProduct(savedProduct('Parliament'))
  await saveProduct(savedProduct('Oldest'))
  for (let index = 0; index < 20; index += 1) {
    const occurredAt = new Date(Date.now() - index * 60_000).toISOString()
    await saveEvent(savedEvent('recent-' + index, 'Parliament', 'cigarette', occurredAt))
  }
  await saveEvent(savedEvent('oldest', 'Oldest', 'cigarette', '2020-01-01T00:00:00.000Z'))

  render(<App />)

  expect(screen.getAllByRole('button', { name: /Редагувати Parliament/ })).toHaveLength(20)
  expect(screen.getByRole('button', { name: 'Показати всі' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Редагувати Oldest' })).toBeNull()

  await user.click(screen.getByRole('button', { name: 'Показати всі' }))

  expect(screen.getAllByRole('button', { name: /Редагувати Parliament/ })).toHaveLength(20)
  expect(screen.getByRole('button', { name: 'Редагувати Oldest' })).toBeTruthy()
})
~~~

Use the existing savedProduct, savedEvent, saveProduct, and saveEvent helpers already present in the test file. The separate Oldest product makes it explicit that the oldest record is hidden until expansion.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

~~~
npm test --prefix web -- src/app/App.test.tsx
~~~

Expected: FAIL because the current screen renders every journalItems element and has no «Показати всі» control.

## Task 2: Implement the display-only journal limit

**Files:**
- Modify: web/src/App.tsx
- Modify: web/src/index.css

**Interfaces:**
- Consumes the existing sorted journalItems array.
- Produces visibleJournalItems, derived from journalItems and a local showAllJournal boolean.
- Does not change events, cravings, IndexedDB calls, analytics inputs, or action handlers.

- [ ] **Step 1: Add the minimum UI state and derived list**

Add local state initialized to false:

~~~
const [showAllJournal, setShowAllJournal] = useState(false)
~~~

Derive the display list without mutating the source array:

~~~
const visibleJournalItems = showAllJournal ? journalItems : journalItems.slice(0, 20)
~~~

Use visibleJournalItems.map(...) in the existing journal renderer. Keep the current journalItems sort unchanged so the first 20 remain the newest mixed consumption/craving records.

- [ ] **Step 2: Add the toggle directly below the list**

Render the control only when journalItems.length > 20:

~~~
{journalItems.length > 20 && (
  <button
    type="button"
    className="text-button journal-toggle"
    onClick={() => setShowAllJournal((expanded) => !expanded)}
  >
    {showAllJournal ? 'Показати менше' : 'Показати всі'}
  </button>
)}
~~~

Place it after </ul> and before the closing journal section. Keep «Показати менше» so a user can return to the compact view without reloading. When there are 20 or fewer records, render no toggle.

- [ ] **Step 3: Add minimal mobile styling**

Style .journal-toggle as a full-width or centered low-emphasis text control with a small top margin. It must not look destructive and must not change the existing .event-list li layout or button sizes.

- [ ] **Step 4: Run focused UI tests and confirm they pass**

Run:

~~~
npm test --prefix web -- src/app/App.test.tsx
~~~

Expected: PASS, including the existing edit/delete, historical-date, craving, and product flows.

## Task 3: Add the approved journal usability features

**Files:**
- Modify: web/src/App.tsx
- Modify: web/src/app/App.test.tsx
- Modify: web/src/index.css
- Modify: web/src/main.tsx only if the existing PWA prompt requires explicit registration

**Interfaces:**
- Consumes the existing combined journal, event/craving actions, local settings and PWA prompt registration.
- Produces a compact full-journal toolbar and safe undo flows without changing stored records or the main Today layout.

- [ ] **Step 1: Group the expanded journal by local calendar day**

When the journal is expanded, render date separators such as «Сьогодні», «Вчора» and a localized date for older days. The 20-item collapsed view remains a simple newest-first list. Grouping must use the existing local-day helper, not UTC string slicing.

- [ ] **Step 2: Add search and filters only to the expanded journal**

Add a compact toolbar visible only after «Показати всі»:

- text search by product name or custom craving reason;
- product filter with «Усі продукти»;
- type filter: «Усі», «Куріння», «Тяга»;
- trigger/tag filter for the existing Ukrainian tags.

Filtering is derived from the already loaded journal and must not mutate IndexedDB. The «Показати менше» action clears the temporary filters and returns to the newest 20 view.

- [ ] **Step 3: Add a period summary for the filtered full journal**

Under the expanded toolbar show a compact summary for the currently visible period: total consumption quantity, total cost, number of craving events, and longest consumption pause in that visible set. Do not add this summary to the Today screen while the journal is collapsed.

- [ ] **Step 4: Add undo for destructive or accidental actions**

Reuse the existing notice area for a short local undo action:

- after deleting an event, show «Запис видалено · Скасувати» and restore the exact event if pressed;
- after a quick product add, show «Додано · Скасувати» and remove only that newly created event if pressed;
- expire the undo action after 8 seconds and never restore a different record;
- keep the existing delete confirmation and do not add a permanent undo card to the main screen.

Add tests for both undo paths and for an expired action no longer changing storage.

- [ ] **Step 5: Add «Додати попередню» and preserve journal position**

Inside the expanded journal toolbar add «Додати попередню». It opens the existing editor with the last selected product and a local date/time input ready to be changed, never silently inventing a historical timestamp. When editing an older entry, restore the previous scroll position after save or cancel so the user does not jump to the top of the journal.

Add tests that the prefilled editor opens, saving creates the intended historical event, and editing an older visible entry keeps the journal position contract.

- [ ] **Step 6: Show a non-blocking PWA update prompt**

Keep the existing vite-plugin-pwa prompt strategy. If the current registration does not expose a UI callback, add the minimal registration bridge and render a dismissible «Доступна нова версія · Оновити» control. Updating must call the service worker update function and reload only after the new worker is ready. No background push or server notification is introduced.

Add a test for the update-needed state if the registration bridge can be injected; otherwise verify the registration wiring through the production build and a manual PWA smoke.

- [ ] **Step 7: Add the app credit and version footer**

At the bottom of «Налаштування», below backup controls, render:

~~~
SmokeLog
Версія 0.3.1
Створено Віталієм за допомогою Codex
~~~

Keep it visually quiet and outside the Today screen. Add an accessible UI assertion for the version and author text.

- [ ] **Step 8: Run focused usability tests**

Run:

~~~
npm test --prefix web -- src/app/App.test.tsx
~~~

Expected: PASS for grouping, filters, period summary, both undo paths, historical entry creation, scroll behavior, update prompt wiring, and the settings footer.

## Task 4: Cover edge cases and release metadata

**Files:**
- Modify: web/src/app/App.test.tsx
- Modify: web/package.json
- Modify: web/package-lock.json

- [ ] **Step 1: Add boundary and behavior tests**

Add three concrete UI tests to web/src/app/App.test.tsx:

1. Seed exactly 20 consumption records, render Today, and assert that all 20 are visible while queryByRole('button', { name: 'Показати всі' }) returns null.
2. Seed a mixed set of consumption and craving items with more than 20 combined entries, render Today, and assert that the collapsed list contains 20 combined items rather than 20 consumption items plus separate cravings.
3. Seed an older record, expand with «Показати всі», click its existing «Редагувати <product>» action, cancel the editor, collapse with «Показати менше», and assert that the older record is still present in storage by expanding again.

The tests must verify display only: no test should expect storage records to disappear after collapsing.

- [ ] **Step 2: Update the release version**

Set the application package version to 0.3.1 and keep the lock-file root package version synchronized. Do not alter dependencies or scripts.

- [ ] **Step 3: Run the complete verification suite**

Run:

~~~
npm test --prefix web
npm run lint --prefix web
npm run build --prefix web
git diff --check
~~~

Expected: all tests pass, TypeScript and oxlint are clean, the production PWA build succeeds, and no whitespace errors are reported.

- [ ] **Step 4: Review the final UI contract**

Confirm:

- 0–20 records: all records are visible and no extra control appears;
- 21+ records: newest 20 are visible and «Показати всі» is below the list;
- expanded state: all records are visible and the control reads «Показати менше»;
- reload returns to the compact 20-item view;
- existing edit/delete and craving actions remain available;
- no storage migration or backup-format change is introduced.

- [ ] **Step 5: Commit the implementation**

~~~
git add web/src/App.tsx web/src/app/App.test.tsx web/src/index.css web/package.json web/package-lock.json
git commit -m "feat: limit recent journal to twenty entries"
~~~

## Acceptance Criteria

- On the Today screen, the «Останні записи» section does not occupy the whole page by default.
- The default list contains exactly the 20 newest combined consumption/craving entries when at least 20 exist.
- «Показати всі» reveals the complete journal without deleting or modifying data.
- The compact view can be restored with «Показати менше».
- Expanded entries are grouped by local day and can be searched and filtered without changing storage.
- The expanded view shows a compact summary for the visible period.
- Deletion and accidental quick additions can be undone only within the defined short window.
- «Додати попередню» opens the existing editor with a safe editable date/time, and editing an older entry does not lose the user's journal position.
- A pending PWA update can be applied through «Доступна нова версія · Оновити» without server push.
- Settings ends with «SmokeLog», «Версія 0.3.1» and «Створено Віталієм за допомогою Codex».
- The change is released as 0.3.1, passes the full test/lint/build suite, and does not alter analytics or backup data.
