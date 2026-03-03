# QA Bug Backlog

## Rules

1. **One at a time**: Only ONE bug may have `fixing` status at any time. Before starting a fix, scan this file for `| Status | \`fixing\` |`. If found, that bug must be completed first.
2. **Priority order**: Fix P1 before P2, P2 before P3.
3. **Status flow**: `open` → `fixing` → `fixed` → `verified` (or `wontfix` / `duplicate`)

## Status Key

| Status | Meaning |
|--------|---------|
| `open` | Discovered, not yet being fixed |
| `fixing` | Actively being worked on (only one at a time) |
| `fixed` | Code change deployed, awaiting verification |
| `verified` | Confirmed fixed on production |
| `wontfix` | Intentional behavior or not worth fixing |
| `duplicate` | Same as another bug (reference it) |

## Bug Entry Template

```markdown
### BUG-NNN: {Title}

| Field | Value |
|-------|-------|
| Status | `open` |
| Priority | `P1` / `P2` / `P3` |
| Type | `visual` / `functional` / `data` |
| Page | `/{path}` |
| Discovered | YYYY-MM-DD |
| Screenshot | `qa/screenshots/BUG-NNN-{slug}.png` |

**Expected**: ...
**Actual**: ...
```

---

## Bugs

### BUG-001: Pets dashboard card links to /humans instead of /pets

| Field | Value |
|-------|-------|
| Status | `verified` |
| Priority | `P1` |
| Type | `functional` |
| Page | `/dashboard` |
| Discovered | 2026-03-02 |
| Verified | 2026-03-02 |
| Screenshot | `qa/screenshots/audit-dashboard-2026-03-02.png` |

**Expected**: Clicking the "Pets 29" stat card navigates to `/pets`.
**Actual**: ~~Clicking the "Pets 29" stat card navigates to `/humans`. The `href` is set to `/humans` instead of `/pets`.~~ **Fixed**: `resolve('/humans')` → `resolve('/pets')` on line 62 of `+page.svelte`. Test added in `test/routes/dashboard/+page.svelte.test.ts`.

---

### BUG-002: MutationObserver TypeError on every page load

| Field | Value |
|-------|-------|
| Status | `verified` |
| Priority | `P2` |
| Type | `functional` |
| Page | `/*` (all pages) |
| Discovered | 2026-03-02 |
| Verified | 2026-03-02 |
| Screenshot | N/A (console error) |

**Expected**: No console errors on page load.
**Actual**: ~~`TypeError: Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'` fires on every page.~~ **Fixed**: Removed the diagnostic trap script from `app.html` (lines 13-134). It was a debugging tool for a blank page issue (fixed in commit 45e65a5) that called `observer.observe(document.body)` in `<head>` before `<body>` existed. Test added in `test/unit/app-html-no-diagnostics.test.ts`.

---

### BUG-003: Linked Route Signup shows blank data on human detail

| Field | Value |
|-------|-------|
| Status | `fixed` |
| Priority | `P2` |
| Type | `functional` |
| Page | `/humans/jilyr6h6gmocm9woe4x8vspn` (Jayne Giles) |
| Discovered | 2026-03-02 |
| Fixed | 2026-03-02 |
| Screenshot | `qa/screenshots/audit-human-detail-2026-03-02.png` |

**Expected**: Linked Route Signups table shows the signup ID, passenger name, and route for each linked signup.
**Actual**: ~~All three columns (ID, Passenger, Route) display "—". Only the Linked Date (24/02/2026) is populated. The signup record exists but its fields aren't resolving.~~ **Fixed**: The enrichment code fetched `/api/route-signups?limit=100` and searched that list — linked signups older than the 100 most recent were missed. Now fetches each linked signup individually via `/api/route-signups/:id` when not found in the bulk list. Same fix applied to booking requests. Note: Jayne Giles' specific record (`a9293d52`) still shows "—" because it's a data anomaly — a booking request ID was linked as a route signup. The booking request enrichment works correctly (`BOR-AAA-003 Jayne Giles London → Dubai`).

---

### BUG-004: Stat card icons use wrong color tier (visual hierarchy collapse)

| Field | Value |
|-------|-------|
| Status | `fixed` |
| Priority | `P3` |
| Type | `visual` |
| Page | `/dashboard` |
| Discovered | 2026-03-02 |
| Fixed | 2026-03-02 |
| Screenshot | `qa/screenshots/audit-dashboard-2026-03-02.png` |

**Expected**: Stat card icons at `text-text-secondary` (one tier above the label text).
**Actual**: ~~Both icon and label are `text-text-muted`, collapsing the visual hierarchy.~~ **Fixed**: Changed icon class from `text-text-muted` to `text-text-secondary` on all 4 stat card icons (Users, PawPrint, Activity, Globe2). Source audit test added in `test/routes/dashboard/+page.svelte.test.ts`.

---

### BUG-005: Stat card hover ring has no transition (snaps on instantly)

| Field | Value |
|-------|-------|
| Status | `fixed` |
| Priority | `P3` |
| Type | `visual` |
| Page | `/dashboard` |
| Discovered | 2026-03-02 |
| Fixed | 2026-03-02 |
| Screenshot | `qa/screenshots/audit-dashboard-2026-03-02.png` |

**Expected**: Hover ring fades in over 200ms per the design system timing scale.
**Actual**: ~~Ring snaps on instantly because `transition` shorthand doesn't include ring properties.~~ **Fixed**: In Tailwind v4, `ring-*` uses CSS `outline` but the bare `transition` utility doesn't include `outline` in its property list. Changed `transition` to `transition-all duration-200` on all 4 dashboard stat cards and 6 other list pages with the same pattern (geo-interests, referral-codes, agreements, phone-numbers, websites, activities). Source audit test added in `test/routes/dashboard/+page.svelte.test.ts`.

---

### BUG-006: Dashboard search input is oversized vs. design system

| Field | Value |
|-------|-------|
| Status | `fixed` |
| Priority | `P3` |
| Type | `visual` |
| Page | `/dashboard` |
| Discovered | 2026-03-02 |
| Fixed | 2026-03-02 |
| Screenshot | `qa/screenshots/audit-dashboard-2026-03-02.png` |

**Expected**: Search input uses standard `glass-input` sizing (text-sm, ~36px height).
**Actual**: ~~`py-3` and `text-base` overrides make it ~48px tall with 1rem font — larger and heavier than every other input in the system.~~ **Fixed**: Changed `py-3 text-base` to `py-2 text-sm` on the dashboard search input, bringing it in line with standard `glass-input` sizing (~36px height). Source audit test added in `test/routes/dashboard/+page.svelte.test.ts`.

---

### BUG-007: Chart axis labels use raw rgba values instead of design tokens

| Field | Value |
|-------|-------|
| Status | `fixed` |
| Priority | `P3` |
| Type | `visual` |
| Page | `/dashboard` |
| Discovered | 2026-03-02 |
| Fixed | 2026-03-03 |
| Screenshot | `qa/screenshots/audit-dashboard-2026-03-02.png` |

**Expected**: Chart axis/tooltip labels reference `--color-text-muted` token.
**Actual**: ~~Four distinct raw `rgba(255,255,255,0.x)` values used across SVG elements. Fragile and won't respond to future color system changes.~~ **Fixed**: Replaced all 4 text `fill` attributes (Y-axis labels, X-axis labels, tooltip date, tooltip daily count) from raw `rgba(255,255,255,0.x)` to `var(--color-text-muted)`. Source audit test added in `ActivityChart.test.ts`.

---

### BUG-008: Chart tooltip border radius not from design system

| Field | Value |
|-------|-------|
| Status | `open` |
| Priority | `P3` |
| Type | `visual` |
| Page | `/dashboard` |
| Discovered | 2026-03-02 |
| Screenshot | `qa/screenshots/audit-dashboard-2026-03-02.png` |

**Expected**: Tooltip `rx="12"` to match `glass-popover` border-radius (0.75rem).
**Actual**: `rx="4"` — not in the radius scale. File: `apps/web/src/lib/components/ActivityChart.svelte` line 224.

---

### BUG-009: Inconsistent section heading bottom margins on dashboard

| Field | Value |
|-------|-------|
| Status | `open` |
| Priority | `P3` |
| Type | `visual` |
| Page | `/dashboard` |
| Discovered | 2026-03-02 |
| Screenshot | `qa/screenshots/audit-dashboard-2026-03-02.png` |

**Expected**: Both section headings use `mb-4` (16px) consistently.
**Actual**: Chart heading uses `mb-4`, Quick Actions heading uses `mb-3` (12px). File: `apps/web/src/routes/dashboard/+page.svelte` lines 88/95.

---

### BUG-010: "View all activities" link floats outside card boundary

| Field | Value |
|-------|-------|
| Status | `open` |
| Priority | `P3` |
| Type | `visual` |
| Page | `/dashboard` |
| Discovered | 2026-03-02 |
| Screenshot | `qa/screenshots/audit-dashboard-2026-03-02.png` |

**Expected**: Link sits inside the card as a footer row with border separation and matching padding.
**Actual**: Free-floating right-aligned link below and outside the glass-card boundary with only 12px top margin. File: `apps/web/src/routes/dashboard/+page.svelte` lines 168-170.

---

### BUG-011: Recent Activity table column order buries Subject

| Field | Value |
|-------|-------|
| Status | `open` |
| Priority | `P3` |
| Type | `visual` |
| Page | `/dashboard` |
| Discovered | 2026-03-02 |
| Screenshot | `qa/screenshots/audit-dashboard-2026-03-02.png` |

**Expected**: Column order: ID, Subject, Type, Owner, Human/Account, Date — surfacing the most informative column earlier.
**Actual**: Column order: ID, Type, Owner, Subject, Human/Account, Date. When most rows share the same type (WhatsApp), the Type column provides zero scanning value and pushes Subject to the 4th position. File: `apps/web/src/routes/dashboard/+page.svelte` lines 114-120.

---

### BUG-012: Date format hydration mismatch (SSR vs client)

| Field | Value |
|-------|-------|
| Status | `verified` |
| Priority | `P1` |
| Type | `functional` |
| Page | `/activities`, `/humans`, and others |
| Discovered | 2026-03-02 |
| Verified | 2026-03-02 |
| Screenshot | `qa/screenshots/audit-activities-list-2026-03-02.png` |

**Expected**: Date format consistent between server-side rendering and client hydration. All dates should use a single explicit format (e.g., DD/MM/YYYY) independent of locale.
**Actual**: ~~Svelte `hydration_mismatch` warning on Activities page. The accessibility tree shows MM/DD/YYYY (e.g., "01/27/2028") while the visual rendering shows DD/MM/YYYY (e.g., "27/01/2028").~~ **Fixed**: Pinned all `toLocaleDateString`/`toLocaleString` calls to `"en-GB"` locale across 15 files. Added `formatShortDate` utility. All dates now consistently DD/MM/YYYY. Note: a generic `hydration_mismatch` Svelte warning persists but dates are consistent — the remaining warning may be from `$app/paths` resolve differences.

---

### BUG-013: General Leads status filter missing "Pending Response" option

| Field | Value |
|-------|-------|
| Status | `fixed` |
| Priority | `P2` |
| Type | `functional` |
| Page | `/leads/general-leads` |
| Discovered | 2026-03-02 |
| Fixed | 2026-03-02 |
| Screenshot | `qa/screenshots/audit-general-leads-2026-03-02.png` |

**Expected**: Status filter dropdown includes all possible statuses: All, Open, Pending Response, Qualified, Closed - Lost, Closed - Converted.
**Actual**: ~~Status filter only had: All, Open, Qualified, Converted, Rejected. "Pending Response" was missing and "closed_rejected"/"Rejected" was used instead of "closed_lost"/"Closed - Lost".~~ **Fixed**: Updated filter options in `+page.svelte` to include all 5 valid statuses from the schema (`open`, `pending_response`, `qualified`, `closed_lost`, `closed_converted`) with correct labels matching `generalLeadStatusLabels`. Audit test added in `test/routes/leads/general-leads/+page.svelte.test.ts`.
