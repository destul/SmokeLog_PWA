# SmokeLog expansion — design

**Status:** approved by the product owner in chat on 2026-08-20.

## Goal

Extend the existing local-only multi-product tracker with the useful parts of
the original Gemini prototype, while retiring that prototype from the active
repository. The current React/IndexedDB application remains the only app.

## Decisions

- Use a black OLED visual system with the original SmokeLog orange accent.
- Reuse Gemini's `icon-192.png` and `icon-512.png` as the installed PWA icons.
- Keep all data in IndexedDB; do not import Gemini's one-pack `localStorage`
  schema.
- Add an optional tag to each consumption event. The shipped tag set is:
  coffee, after food, work/break, stress, alcohol/bar, road, company, boredom,
  and before sleep. A tag is selected in the add/edit form and can be cleared.
- The Today screen shows the elapsed time and timestamp of the most recent
  consumption event. It refreshes every minute and shows a clear empty state.
- The Week screen remains exactly seven local calendar days. It gains an SVG-
  free CSS bar chart of daily quantities, a 24-hour heat map, and tag totals.
  Quantities remain the user-facing measure; vape stays puff-count-only and
  has no cost calculation.
- Backup is a versioned JSON object containing all products and events. Export
  downloads it locally. Import validates the version and record shapes, then
  upserts only valid products/events by ID; it never deletes existing data.
- The active root contains only the React PWA. The obsolete Gemini entry files
  (`index.html`, `app.js`, `style.css`, `manifest.json`, `sw.js`, `server.py`,
  `icon.svg`, and root icon copies) are deleted after their PNG assets have
  been copied into `web/public/icons`. Git history remains the recovery path.

## Data and boundaries

`ConsumptionEvent` gets `tagId?: string`. Tags are constants in a domain
module, rather than user-managed records, so a backup remains self-contained
and analytics does not depend on configuration state.

`analytics.ts` is pure: it receives events and a date range and returns daily
totals, 24 local-hour buckets, and tag totals. `backup.ts` is pure: it creates
and parses the backup envelope; IndexedDB only provides list and upsert
operations. The React component renders these results and owns browser-only
file download/import interactions.

## Error handling and privacy

Invalid files, unknown backup versions, malformed dates, invalid positive
quantities, missing category/product IDs, or unknown tag IDs are rejected with
a visible message and no writes. All functionality works offline after the PWA
has loaded. No external API, account, tracker, or cloud sync is added.

## Acceptance checks

- All existing tracking and costing behaviour still passes.
- The manifest and installed page use black theme colours and Gemini PNG icons.
- A tag survives add, edit, export, import, and appears in week analytics.
- A known event produces the correct daily bar, hour bucket, and tag total.
- Backup round-trips the data and malformed backup input produces no mutation.
- The last-consumption display handles no events, minutes, hours, and days.
- Build, lint, and full tests pass before publishing.
