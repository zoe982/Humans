# Orchestrator State

Updated each iteration. Used for context recovery after compaction.

## Why the Regression Slipped

- **Unit/component tests exist** (`@testing-library/svelte` + happy-dom) but only assert behaviour (renders, clicks, callbacks) — zero tests verify visual properties like background opacity or class assignments that affect readability.
- **Playwright e2e tests exist** (3 files) but cover navigation and dropdown interactions — no destructive-action flows (delete, confirm) are tested.
- **No visual regression / screenshot tests** configured.
- **No a11y contrast checks** (axe-core or similar) in any test suite.
- **The `dialog-content.svelte` was correctly migrated to `glass-dialog` (97% opaque) but `alert-dialog-content.svelte` was left on `glass-card-strong` (82% opaque in light mode, 15% opaque in dark mode).** The inconsistency was never caught because no test checks which glass class dialog surfaces use.

## Current Objective

All P0–P3 objectives complete.

## Decisions Made

- P0: Component-level test asserting `glass-dialog` class on dialog surfaces. Fixed all 3 `glass-card-strong` dialog surfaces.
- P1: Only Accounts page used tabs. Converted to flat layout. Structural enforcement test (no role="tablist").
- P2: Added `searchFilter`, sortable columns, `defaultSortKey`/`defaultSortDirection` to every RelatedListTable across all detail pages. RelatedListTable component test added.
- P3: Removed Geo-Interests from nav → added as report card. Replaced Colleagues embedded table with clickable report card. Playwright tests updated.

## Completed

- [x] P0: Delete overlay fix — `glass-card-strong` → `glass-dialog` on alert-dialog, command-dialog, sheet
- [x] P1: Accounts tabs removed, flat layout, structural test enforced, Accounts smoke test added
- [x] P2: Search + sort on all RelatedListTable instances, RelatedListTable component tests
- [x] P3: Geo-Interests moved to Reports, Colleagues made clickable report card, nav de-crowded, Playwright tests updated

## Last Test Run

```
Command: cd apps/web && pnpm test 2>&1 | tail -n 10
Status: 78 files, 831 tests, ALL PASSED
```
