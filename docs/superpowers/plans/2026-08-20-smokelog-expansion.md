# SmokeLog Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the useful Gemini features in the current React/IndexedDB PWA and remove the retired Gemini app files.

**Architecture:** Add pure domain modules for tags, elapsed-time formatting, seven-day analytics, and versioned backups. Keep IndexedDB as the persistence boundary and render the new Today, Week, and Settings controls in the existing React screen. Replace the styling and PWA asset references while preserving multi-product data.

**Tech Stack:** React 19, TypeScript, Vite PWA, Vitest, Testing Library, IndexedDB via idb.

**Spec:** `docs/superpowers/specs/2026-08-20-smokelog-expansion-design.md`

## Global Constraints

- Keep all user data on-device in IndexedDB; add no network calls or accounts.
- Keep four product categories and zero vape cost.
- Week analytics covers exactly seven local calendar days.
- Import merges valid backup records and never clears the local database.
- Use Gemini's supplied PNG icons, not newly generated visual assets.

---

### Task 1: Event metadata and pure domain calculations

**Files:**
- Modify: `web/src/domain/types.ts`, `web/src/domain/statistics.ts`
- Create: `web/src/domain/tags.ts`, `web/src/domain/analytics.ts`, `web/src/domain/elapsed.ts`
- Test: `web/src/domain/analytics.test.ts`, `web/src/domain/elapsed.test.ts`

- [ ] Write failing tests for a tagged event, seven day bars, local hour buckets, tag totals, and elapsed minute/hour/day strings.
- [ ] Run the new test files and confirm the imports fail before implementation.
- [ ] Implement immutable tag constants, calculation helpers, and strict elapsed formatting.
- [ ] Run the domain suite and confirm it passes.
- [ ] Commit the completed domain boundary.

### Task 2: Versioned backup persistence

**Files:**
- Create: `web/src/storage/backup.ts`
- Modify: `web/src/storage/db.ts`
- Test: `web/src/storage/backup.test.ts`, `web/src/storage/db.test.ts`

- [ ] Write failing tests for backup creation, successful parsing, and rejection of malformed content without persistence changes.
- [ ] Run the backup tests and confirm they fail before implementation.
- [ ] Implement schema/version validation and an IndexedDB bulk upsert that writes validated products and events in one transaction.
- [ ] Run backup and storage tests and confirm they pass.
- [ ] Commit the completed backup boundary.

### Task 3: React controls and OLED mobile UI

**Files:**
- Modify: `web/src/App.tsx`, `web/src/index.css`, `web/index.html`, `web/vite.config.ts`
- Copy: root `icon-192.png`, `icon-512.png` to `web/public/icons/`
- Test: `web/src/app/App.test.tsx`, `web/src/app/pwa.test.ts`

- [ ] Write failing UI and manifest tests for elapsed time, event tags, seven-day chart and heat map, tag totals, backup controls, black colours, and PNG icons.
- [ ] Run the focused UI/PWA tests and confirm their expected assertions fail.
- [ ] Render the pure results in Today/Week/Settings, add file download/import error handling, and implement the black OLED CSS.
- [ ] Run focused UI/PWA tests and confirm they pass.
- [ ] Commit the user-facing feature.

### Task 4: Retire Gemini root application and verify release

**Files:**
- Delete: `app.js`, `style.css`, `index.html`, `manifest.json`, `sw.js`, `server.py`, `icon.svg`, `icon-192.png`, `icon-512.png`, root placeholder `README.md`
- Modify: `web/README.md` if needed for backup instructions

- [ ] Confirm the copied icon files exist under `web/public/icons` before deleting root sources.
- [ ] Remove only the listed retired Gemini files and leave Git history as recovery.
- [ ] Run `npm run test`, `npm run lint`, and `npm run build` from `web`.
- [ ] Inspect the final diff and commit only feature-owned files.
- [ ] Publish the authorized GitHub update and verify the deployed Pages assets and manifest return HTTP 200.
