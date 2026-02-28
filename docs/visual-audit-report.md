# Visual Polish & Consistency Audit Report

**Date**: 2026-02-28
**Auditor**: Ive (UI/UX Design Agent)
**Scope**: `apps/web/src/` -- all routes, components, and design system files

---

## Summary Table

| ID | Severity | Category | Description | Files Affected |
|----|----------|----------|-------------|----------------|
| C-01 | P1 | Color | Required-field asterisks use hardcoded `text-red-400` | 20+ instances across 12 files |
| C-02 | P1 | Color | Login error banner uses hardcoded red classes | 1 file |
| C-03 | P1 | Color | LeadScoreBadge uses hardcoded color classes, no CSS vars | 1 component |
| C-04 | P1 | Color | Lead score report pages use hardcoded Tailwind colors throughout | 2 files |
| C-05 | P1 | Color | "Complete" / "Done" buttons use hardcoded `bg-emerald-600` | 2 files (4 instances) |
| C-06 | P1 | Color | Cadence warning labels use hardcoded `text-amber-400/500` | 2 files (5 instances) |
| C-07 | P1 | Color | Check icons use hardcoded `text-emerald-500` | 2 files (12 instances) |
| C-08 | P1 | Color | AlertBanner success variant uses hardcoded `border-green-500/30 bg-green-500/10` | 1 component |
| C-09 | P1 | Color | DuplicateContactBanner uses hardcoded `border-amber-500/30 bg-amber-500/10 text-amber-200` | 1 component |
| C-10 | P1 | Color | OfflineBanner uses hardcoded `bg-amber-600/90` | 1 component |
| C-11 | P1 | Color | Danger zones on lead detail pages use hardcoded `border-red-500/20 bg-red-500/5` | 3 files |
| C-12 | P1 | Color | Overdue dates use hardcoded `text-red-400` | 1 file (2 instances) |
| C-13 | P1 | Color | Front sync page uses extensive hardcoded color borders/backgrounds | 1 file (12+ instances) |
| C-14 | P1 | Color | Account error state uses hardcoded `text-red-400` and `border-red-500/30` | 1 file |
| C-15 | P1 | Color | FormattedActivityText suspicious link uses hardcoded `text-amber-500` | 1 component |
| C-16 | P1 | Color | LeadScoreInlineFlags uses hardcoded `text-green-400`, `text-purple-400`, etc. | 1 component |
| C-17 | P1 | Color | `text-cyan-300` used for stat value on route interest detail | 1 file |
| C-18 | P1 | Color | `text-red-300` used for login error message text | 1 file |
| L-01 | P2 | Layout | Humans detail page uses `max-w-7xl` instead of `max-w-5xl` | 1 file |
| L-02 | P2 | Layout | Opportunities detail page uses `max-w-7xl` instead of `max-w-5xl` | 1 file |
| L-03 | P2 | Layout | Flights detail page uses `max-w-7xl` instead of `max-w-5xl` | 1 file |
| L-04 | P2 | Layout | Error log detail page uses `max-w-7xl` instead of `max-w-5xl` | 1 file |
| L-05 | P3 | Layout | EntityListPage has no `max-w-*` container constraint | 1 component |
| D-01 | P2 | Dates | Mixed date formatting: raw `toLocaleDateString()` vs `formatDate()` utility | 20+ files |
| D-02 | P2 | Dates | Custom `formatDatetime()` functions duplicated in 5+ lead/signup files | 5 files |
| D-03 | P3 | Dates | `toLocaleString()` used with no format options in some places | 4 files |
| D-04 | P3 | Dates | Mixed null-value placeholders: `"---"` vs `"\u2014"` vs `"None"` | Widespread |
| T-01 | P3 | Typography | Next Action heading uses `font-bold` while all other section headings use `font-semibold` | 2 files |
| T-02 | P3 | Typography | Dashboard search input uses `text-base` (16px) while all other inputs use `text-sm` (14px) | 1 file |
| T-03 | P2 | Typography | Error page status code uses `text-5xl` -- off the type scale | 1 file |
| B-01 | P2 | Buttons | "Done" complete button is a 4th variant (`bg-emerald-600`) not in the system | 2 files |
| B-02 | P2 | Buttons | Front sync buttons are inline-styled, not using `btn-primary`/`btn-ghost` | 1 file (4 buttons) |
| B-03 | P3 | Buttons | Pagination disabled state uses `opacity-40` instead of system `opacity-50` | 1 component |
| B-04 | P2 | Buttons | Non-existent token `bg-glass-bg` used in front-sync page | 1 file (14+ instances) |
| I-01 | P3 | Interactive | `transition-all` used in 3 places (should specify exact properties) | 2 files |
| I-02 | P3 | Interactive | Focus rings missing on most custom buttons (Create New / Link Existing pills) | 5+ files |
| I-03 | P2 | Interactive | Ring color for filled inputs uses hardcoded `ring-emerald-500/30` | 2 files (4 instances) |

---

## 1. Color System Compliance

The design system defines CSS custom properties in `app.css` for both dark and light modes, with badge utilities (`badge-blue`, `badge-green`, etc.) and semantic tokens (`--badge-*-bg`, `--badge-*-text`). However, many components and pages bypass this system entirely with hardcoded Tailwind color classes.

### C-01: Required-field asterisks use hardcoded `text-red-400` (P1)

Every required-field asterisk across the app uses `text-red-400` -- a hardcoded color that will appear washed out in light mode where it should use a darker red.

**Affected files (20+ instances):**
- `apps/web/src/routes/websites/new/+page.svelte:42`
- `apps/web/src/routes/pets/new/+page.svelte:39, 49`
- `apps/web/src/routes/emails/new/+page.svelte:42, 52`
- `apps/web/src/routes/phone-numbers/new/+page.svelte:43, 53`
- `apps/web/src/routes/social-ids/new/+page.svelte:42`
- `apps/web/src/routes/agreements/new/+page.svelte:51`
- `apps/web/src/routes/referral-codes/new/+page.svelte:42`
- `apps/web/src/routes/humans/new/+page.svelte:68`
- `apps/web/src/routes/leads/general-leads/new/+page.svelte:33, 49`
- `apps/web/src/routes/humans/[id]/+page.svelte:1747`
- `apps/web/src/routes/accounts/[id]/+page.svelte:1278`
- `apps/web/src/routes/opportunities/[id]/+page.svelte:533, 552, 573`
- `apps/web/src/lib/components/NextActionSection.svelte:245, 264, 285`

```svelte
<span class="text-red-400">*</span>
```

**Recommended fix**: Create a CSS variable `--required-asterisk` (dark: `#fca5a5`, light: `#b91c1c`) and use `text-destructive-foreground` or a new utility class `text-required`.

---

### C-02: Login error banner uses hardcoded red classes (P1)

**File**: `apps/web/src/routes/login/+page.svelte:23-25`

```svelte
<div class="mb-6 flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
  <AlertTriangle size={20} class="mt-0.5 shrink-0 text-red-400" />
  <p class="text-sm text-red-300">{data.errorMessage}</p>
</div>
```

Four hardcoded colors in one block: `bg-red-500/10`, `border-red-500/20`, `text-red-400`, `text-red-300`. Should use `bg-destructive`, `border-[var(--btn-danger-border)]`, and `text-destructive-foreground`.

---

### C-03: LeadScoreBadge uses hardcoded color classes (P1)

**File**: `apps/web/src/lib/components/LeadScoreBadge.svelte:12-15`

```typescript
const colorClasses = $derived(
  band === "hot"
    ? "bg-red-500/20 text-red-400 border-red-500/30"
    : band === "warm"
      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      : "bg-blue-500/20 text-blue-400 border-blue-500/30",
);
```

Nine hardcoded color values. Should use `badge-red`, `badge-yellow`, `badge-blue` utilities or CSS variables.

---

### C-04: Lead score report pages use hardcoded Tailwind colors (P1)

**Files**:
- `apps/web/src/routes/reports/lead-scores/[id]/+page.svelte:114-126, 380-413`
- `apps/web/src/routes/reports/lead-scores/+page.svelte:80-88, 151`

Examples:
```svelte
<!-- Score category colors -->
<div class="text-lg font-semibold text-green-400">+{score.scoreFit}</div>
<div class="text-lg font-semibold text-blue-400">+{score.scoreIntent}</div>
<div class="text-lg font-semibold text-purple-400">+{score.scoreEngagement}</div>
<div class="text-lg font-semibold text-red-400">-{score.scoreNegative}</div>

<!-- Band filter pills -->
class="... {currentBand === 'hot' ? 'bg-red-500/20 text-red-400' : 'bg-glass text-text-secondary'}"
```

---

### C-05: "Complete/Done" buttons use hardcoded `bg-emerald-600` (P1)

**Files**:
- `apps/web/src/routes/opportunities/[id]/+page.svelte:433, 438`
- `apps/web/src/lib/components/NextActionSection.svelte:143, 148`

```svelte
<Button onclick={completeNextAction} class="bg-emerald-600 hover:bg-emerald-500 text-white">
```

This introduces a 4th button variant (emerald/green) outside the three-variant system (`btn-primary`, `btn-ghost`, `btn-danger`). In light mode, the hardcoded `text-white` on `bg-emerald-600` will work, but the color itself has no semantic backing.

---

### C-06: Cadence warning labels use hardcoded amber (P1)

**Files**:
- `apps/web/src/routes/opportunities/[id]/+page.svelte:456, 545, 551`
- `apps/web/src/lib/components/NextActionSection.svelte:257, 263`

```svelte
<p class="text-sm text-amber-400 font-medium">Please set a next action...</p>
<p class="mt-1 text-xs text-amber-500">Due date exceeds the recommended cadence...</p>
<label class="... text-sm font-medium text-amber-400">Reason for extended cadence</label>
```

No amber/warning CSS variables exist in the system. Should define `--warning-text` and `--warning-bg` tokens.

---

### C-07: Check icons use hardcoded `text-emerald-500` (P1)

**Files**:
- `apps/web/src/routes/opportunities/[id]/+page.svelte:498, 515, 535, 554, 575`
- `apps/web/src/lib/components/NextActionSection.svelte:210, 227, 247, 266, 287`

```svelte
<Check size={14} class="text-emerald-500" />
```

Twelve instances. No emerald token exists. Should use a success-state variable.

---

### C-08: AlertBanner success variant uses hardcoded green classes (P1)

**File**: `apps/web/src/lib/components/AlertBanner.svelte:20`

```svelte
class="mb-4 {type === 'success' ? 'border-green-500/30 bg-green-500/10 text-[var(--badge-green-text)]' : ''}"
```

Mixed approach: `border-green-500/30` and `bg-green-500/10` are hardcoded, while `text-[var(--badge-green-text)]` uses the CSS variable. All three should use CSS variables.

---

### C-09: DuplicateContactBanner uses hardcoded amber classes (P1)

**File**: `apps/web/src/lib/components/DuplicateContactBanner.svelte:65`

```svelte
<Alert variant="default" class="mb-4 border-amber-500/30 bg-amber-500/10 text-amber-200">
```

Three hardcoded colors. `text-amber-200` will be extremely low contrast in light mode.

---

### C-10: OfflineBanner uses hardcoded amber (P1)

**File**: `apps/web/src/lib/components/OfflineBanner.svelte:24`

```svelte
<div role="status" class="bg-amber-600/90 text-white text-center text-sm py-2 px-4">
```

Hardcoded background color.

---

### C-11: Danger zones on lead detail pages use hardcoded red (P1)

**Files**:
- `apps/web/src/routes/leads/route-signups/[id]/+page.svelte:761`
- `apps/web/src/routes/leads/general-leads/[id]/+page.svelte:787`
- `apps/web/src/routes/leads/website-booking-requests/[id]/+page.svelte:980`

```svelte
<div class="glass-card p-6 border-red-500/20 bg-red-500/5">
```

Should use `border-[var(--btn-danger-border)]` and `bg-destructive`.

---

### C-12: Overdue dates use hardcoded `text-red-400` (P1)

**File**: `apps/web/src/routes/opportunities/+page.svelte:159, 198`

```svelte
<span class={opp.isOverdue ? "text-red-400 font-medium" : "text-text-muted"}>
```

---

### C-13: Front sync page uses extensive hardcoded colors (P1)

**File**: `apps/web/src/routes/admin/front-sync/+page.svelte`

Twelve+ instances of hardcoded `border-yellow-500/30`, `bg-yellow-500/5`, `border-green-500/30`, `bg-green-500/5`, `border-red-500/30`, `bg-red-500/10`, `border-yellow-500/10`, `hover:bg-yellow-500/10`.

Lines: 518, 535, 626, 642, 658, 726, 746, 761, 852.

---

### C-14: Account error state uses hardcoded colors (P1)

**File**: `apps/web/src/routes/accounts/[id]/+page.svelte:429-430`

```svelte
<div class="glass-card p-6 space-y-4 border border-red-500/30">
  <h2 class="text-lg font-semibold text-red-400">Failed to load account</h2>
```

---

### C-15: FormattedActivityText suspicious link color (P1)

**File**: `apps/web/src/lib/components/FormattedActivityText.svelte:49`

```svelte
class="text-amber-500 hover:underline inline-flex items-center gap-0.5"
```

---

### C-16: LeadScoreInlineFlags uses hardcoded category colors (P1)

**File**: `apps/web/src/lib/components/LeadScoreInlineFlags.svelte:101, 137, 175, 266`

```svelte
<span class="text-xs font-semibold uppercase text-green-400">Fit</span>
<span class="text-xs font-semibold uppercase text-purple-400">Engagement</span>
<span class="text-xs font-semibold uppercase text-blue-400">Intent</span>
<span class="text-xs font-semibold uppercase text-red-400">Negative</span>
```

---

### C-17: Route interest stat uses hardcoded `text-cyan-300` (P1)

**File**: `apps/web/src/routes/route-interests/[id]/+page.svelte:244`

```svelte
<p class="text-2xl font-bold text-cyan-300">{uniqueHumanCount}</p>
```

Adjacent stat values use `text-accent` and `text-text-secondary`. This one alone uses `text-cyan-300`.

---

### C-18: Login error message uses `text-red-300` (P1)

**File**: `apps/web/src/routes/login/+page.svelte:25`

```svelte
<p class="text-sm text-red-300">{data.errorMessage}</p>
```

Different shade from the `text-red-400` used for the icon on line 24. Inconsistent even within the same banner.

---

## 2. Layout & Container Consistency

The design system convention is: detail/create pages use `max-w-5xl`, hub/list/admin pages use `max-w-7xl`.

### L-01: Humans detail page uses `max-w-7xl` (P2)

**File**: `apps/web/src/routes/humans/[id]/+page.svelte:435`

```svelte
<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
```

This is a detail page for a single human record, but uses the wide `max-w-7xl` layout. Every other detail page (accounts, pets, emails, etc.) correctly uses `max-w-5xl`. The humans detail page is content-heavy, but consistency matters.

---

### L-02: Opportunities detail page uses `max-w-7xl` (P2)

**File**: `apps/web/src/routes/opportunities/[id]/+page.svelte:392`

```svelte
<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
```

Same issue as L-01. Detail page with wide container.

---

### L-03: Flights detail page uses `max-w-7xl` (P2)

**File**: `apps/web/src/routes/flights/[id]/+page.svelte:73`

```svelte
<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
```

---

### L-04: Error log detail page uses `max-w-7xl` (P2)

**File**: `apps/web/src/routes/admin/error-log/[id]/+page.svelte:61`

```svelte
<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
```

---

### L-05: EntityListPage has no `max-w-*` container (P3)

**File**: `apps/web/src/lib/components/EntityListPage.svelte:158`

```svelte
<div class="px-4 py-8 sm:px-6 lg:px-8">
```

The list pages that use `EntityListPage` have no max-width constraint. The content stretches to full viewport width. This is probably intentional for table-heavy views, but it means the layout nav bar (in `+layout.svelte` at `max-w-7xl`) and the list pages have mismatched widths. The search input within EntityListPage does have `max-w-md`, but the table itself extends infinitely.

Note: Some list pages that don't use EntityListPage (e.g., route-interests, colleagues) have their own `max-w-7xl` wrapper.

---

## 3. Date & Text Formatting

### D-01: Mixed date formatting approaches (P2)

The codebase has two available utility functions in `apps/web/src/lib/utils/format.ts`:
- `formatDate()` -- returns "DD/MM/YYYY" via `toLocaleDateString()` with explicit options
- `formatDateTime()` -- returns "DD/MM/YYYY, HH:MM" with 24h format

However, many files call `new Date(...).toLocaleDateString()` directly without format options, producing browser-default locale formatting. This creates inconsistent date displays.

**Files using raw `toLocaleDateString()` (no options):**
- `apps/web/src/routes/humans/+page.svelte:89`
- `apps/web/src/routes/accounts/+page.svelte:67`
- `apps/web/src/routes/geo-interests/+page.svelte:122`
- `apps/web/src/routes/geo-interests/[id]/+page.svelte:175`
- `apps/web/src/routes/geo-interest-expressions/+page.svelte:64`
- `apps/web/src/routes/route-interests/+page.svelte:183, 301`
- `apps/web/src/routes/opportunities/+page.svelte:160, 177, 199`
- `apps/web/src/routes/opportunities/[id]/+page.svelte:843`
- `apps/web/src/routes/humans/[id]/+page.svelte:1653, 1913, 1972, 2027`
- `apps/web/src/routes/leads/all/+page.svelte:252, 270, 311`
- `apps/web/src/routes/leads/general-leads/+page.svelte:222, 255`
- `apps/web/src/routes/reports/lead-scores/+page.svelte:163`
- `apps/web/src/routes/discount-codes/[id]/+page.svelte:149`
- `apps/web/src/routes/flights/+page.svelte:59, 82`

**Files correctly using `formatDate()`:**
- `apps/web/src/routes/dashboard/+page.svelte:165`
- `apps/web/src/routes/activities/+page.svelte:147, 156`
- `apps/web/src/routes/search/+page.svelte:164`
- `apps/web/src/routes/opportunities/[id]/+page.svelte:473`
- `apps/web/src/lib/components/NextActionSection.svelte:185`

**Recommended fix**: Replace all raw `toLocaleDateString()` calls with `formatDate()` from `$lib/utils/format`.

---

### D-02: Duplicated `formatDatetime()` local functions (P2)

Five files define their own local `formatDatetime()` function with the exact same implementation:

```typescript
function formatDatetime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
```

**Files**:
- `apps/web/src/routes/leads/route-signups/[id]/+page.svelte:253`
- `apps/web/src/routes/leads/route-signups/+page.svelte:67`
- `apps/web/src/routes/leads/general-leads/[id]/+page.svelte:243`
- `apps/web/src/routes/leads/website-booking-requests/[id]/+page.svelte:301`
- `apps/web/src/routes/leads/website-booking-requests/+page.svelte:45`

This duplicates logic AND uses raw `toLocaleDateString()` (without options), producing locale-dependent formatting. The utility `formatDateTime()` in `$lib/utils/format.ts` already exists and provides consistent formatting.

**Recommended fix**: Delete all local `formatDatetime()` functions and import `formatDateTime` from `$lib/utils/format`.

---

### D-03: `toLocaleString()` used with no format options (P3)

**Files**:
- `apps/web/src/routes/reports/lead-scores/[id]/+page.svelte:450, 454, 459`
- `apps/web/src/routes/geo-interests/expressions/[id]/+page.svelte:149`
- `apps/web/src/routes/route-interests/expressions/[id]/+page.svelte:255`
- `apps/web/src/routes/admin/error-log/[id]/+page.svelte:127`
- `apps/web/src/routes/admin/error-log/+page.svelte:123`
- `apps/web/src/routes/admin/audit-log/+page.svelte:46`
- `apps/web/src/routes/admin/front-sync/+page.svelte:339` (defines own `formatDate()`)

These produce browser-locale-dependent formatting. Should use `formatDateTime()`.

---

### D-04: Mixed null-value placeholders (P3)

Three different placeholder conventions are used for missing/null values:

| Placeholder | Files using it |
|-------------|---------------|
| `"---"` (em-dash literal) | 30+ files in routes (e.g., lead scores, flights, leads/all, opportunities) |
| `"\u2014"` (unicode em-dash) | 15+ files (flights, discount-codes, leads/all, NextActionSection) |
| `"None"` (as `emptyOption` prop) | 50+ SearchableSelect instances |

The `"---"` and `"\u2014"` are visually identical (both render as em-dash), so this is not a visual bug. However, `"None"` (used as dropdown empty-option text) is a different word entirely. This is actually fine since it serves a different purpose (dropdown placeholder vs data display).

**Recommendation**: Standardize the em-dash sources to always use `"\u2014"` for consistency in code, even though the visual output is identical.

---

## 4. Typography & Text Hierarchy

### T-01: Next Action heading uses `font-bold` while siblings use `font-semibold` (P3)

**Files**:
- `apps/web/src/routes/opportunities/[id]/+page.svelte:422`
- `apps/web/src/lib/components/NextActionSection.svelte:132`

```svelte
<h2 class="text-lg font-bold text-text-primary">Next Action</h2>
```

Every other `<h2>` section heading across the entire app uses `text-lg font-semibold`. The Next Action section uses `font-bold` (700) instead of `font-semibold` (600). This creates a subtle weight inconsistency.

Verified against 100+ `<h2>` section headings -- all use `font-semibold` except these two.

---

### T-02: Dashboard search input uses `text-base` (P3)

**File**: `apps/web/src/routes/dashboard/+page.svelte:48`

```svelte
class="glass-input w-full pl-12 pr-4 py-3 text-base"
```

The `glass-input` utility defines `font-size: 0.875rem` (text-sm). This override to `text-base` (16px) is the only input in the entire app that deviates from the standard 14px input size. The larger search on the dashboard might be intentional as a hero search, but it breaks input size consistency.

---

### T-03: Error page status code uses `text-5xl` (P2)

**File**: `apps/web/src/routes/+error.svelte:16`

```svelte
<p class="text-5xl font-bold text-accent">{$page.status}</p>
```

`text-5xl` (3rem/48px) is outside the established type scale. The largest defined size is `text-3xl` (used for dashboard hero numbers and the login title). For an error page, `text-3xl` or `text-4xl` would be more appropriate.

---

## 5. Component Pattern Consistency

### B-01: "Done" button creates a 4th button variant (P2)

**Files**:
- `apps/web/src/routes/opportunities/[id]/+page.svelte:433, 438`
- `apps/web/src/lib/components/NextActionSection.svelte:143, 148`

```svelte
<Button onclick={completeNextAction} class="bg-emerald-600 hover:bg-emerald-500 text-white">
```

The design system defines exactly three button variants: `btn-primary`, `btn-ghost`, `btn-danger`. This emerald "success" button is a 4th variant created ad-hoc. It also uses hardcoded colors that bypass the CSS variable system.

**Recommended fix**: Use `btn-primary` for the "Done" action (it is the primary action of the section), or if a distinct success variant is truly needed, define it formally as `btn-success` in `app.css` with proper CSS variable backing.

---

### B-02: Front sync buttons are inline-styled instead of using system buttons (P2)

**File**: `apps/web/src/routes/admin/front-sync/+page.svelte:571, 586, 600, 614`

```svelte
class="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white
       hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
```

```svelte
class="inline-flex items-center gap-2 rounded-lg border border-glass-border bg-glass-bg px-4 py-2
       text-sm font-medium text-text-primary hover:bg-glass-bg/80 disabled:opacity-50
       disabled:cursor-not-allowed transition-colors"
```

Four buttons are styled entirely inline, duplicating the same long class strings. The first should use `btn-primary` and the latter three should use `btn-ghost`. Additionally, they reference `bg-glass-bg` which is not a defined token (see B-04).

---

### B-03: Pagination disabled state uses `opacity-40` instead of `opacity-50` (P3)

**File**: `apps/web/src/lib/components/Pagination.svelte:47, 63`

```svelte
<span class="... opacity-40 cursor-not-allowed">
```

The design system specifies `opacity: 0.5` for all disabled states. The pagination uses `opacity-40` (0.4), making disabled buttons slightly more transparent than the system standard.

---

### B-04: Non-existent `bg-glass-bg` token used (P2)

**File**: `apps/web/src/routes/admin/front-sync/+page.svelte` (14+ instances, lines 586, 600, 614, 670, 674, 678, 682, 690, 694, 698, 702, 706, 710, 913, 948)

```svelte
class="... bg-glass-bg ..."
```

The token `glass-bg` / `--color-glass-bg` does not exist in `app.css` or the `@theme` block. This likely resolves to nothing (transparent), which might be fine in dark mode where the parent provides the background, but it is a reference to a non-existent token. Should use `bg-glass` (which maps to `rgba(255,255,255,0.11)`).

---

### I-03: Filled input validation ring uses hardcoded emerald (P2)

**Files**:
- `apps/web/src/routes/opportunities/[id]/+page.svelte:565, 582`
- `apps/web/src/lib/components/NextActionSection.svelte:277, 294`

```svelte
class="glass-input block w-full resize-none {naCadenceNote.trim() ? 'ring-1 ring-emerald-500/30 border-emerald-500/30' : ''}"
```

Validated/filled inputs get a green ring via hardcoded `ring-emerald-500/30`. No CSS variable exists for this. Should use a success-state variable, or remove the visual indicator if it does not serve a clear UX purpose.

---

## 6. Interactive States

### I-01: `transition-all` used instead of specific properties (P3)

**Files**:
- `apps/web/src/routes/opportunities/[id]/+page.svelte:419`
- `apps/web/src/lib/components/NextActionSection.svelte:129`
- `apps/web/src/lib/components/ActivityConversationView.svelte:441`

```svelte
class="... transition-all duration-300"
```

The design system principle states: "Never use `transition: all` -- always specify exactly which properties animate." These should specify the exact properties transitioning (e.g., `transition-colors transition-shadow` or just `transition-[background,border-color,box-shadow]`).

---

### I-02: Focus rings missing on custom Create New / Link Existing pill buttons (P3)

**Files** (all detail pages with contact management):
- `apps/web/src/routes/humans/[id]/+page.svelte:837-838, 968-969, 1074-1075`
- `apps/web/src/routes/accounts/[id]/+page.svelte:580-581, 708-709, 811-812`
- `apps/web/src/routes/leads/route-signups/[id]/+page.svelte:516-517, 587-588, 658-659`
- `apps/web/src/routes/leads/general-leads/[id]/+page.svelte:534-535, 607-608, 678-679`
- `apps/web/src/routes/leads/website-booking-requests/[id]/+page.svelte:735-736, 806-807, 877-878`

```svelte
<button type="button" class="px-3 py-1 text-xs rounded-full transition-colors
  {emailAddMode === 'create' ? 'bg-accent text-white' : 'bg-glass-hover text-text-muted'}">
  Create New
</button>
```

These pill toggle buttons have no `:focus-visible` ring definition. They use `transition-colors` but no `focus-visible:outline` or `focus-visible:ring`. Every interactive element must have a visible focus state for accessibility.

---

## Cross-Cutting Observations

### Systematic Missing: Warning/Amber Token

The design system defines status colors for blue (open/info), green (active/converted), red (closed/rejected), and yellow (qualified). However, there is no formal **warning/amber** token, despite extensive use of amber/yellow for warnings (cadence deviations, offline banner, duplicate contact warnings, overdue dates). At least 15 instances of hardcoded amber colors exist.

**Recommendation**: Add to `app.css`:
```css
:root {
  --warning-bg: rgba(245, 158, 11, 0.12);
  --warning-border: rgba(245, 158, 11, 0.30);
  --warning-text: #fbbf24;
}
.light {
  --warning-bg: rgba(245, 158, 11, 0.12);
  --warning-border: rgba(245, 158, 11, 0.25);
  --warning-text: #b45309;
}
```

### Systematic Missing: Success/Emerald Token

Similarly, emerald/green is used for success states (check marks, "Done" buttons, filled input indicators) but has no formal token. At least 16 instances of hardcoded emerald colors exist.

**Recommendation**: Add `--success-text`, `--success-bg`, `--success-border` tokens.

### Test File References to Hardcoded Colors

Two test files reference hardcoded Tailwind classes:
- `apps/web/src/lib/components/StatusBadge.test.ts:12, 15` -- `bg-green-500 text-white`
- `apps/web/src/lib/components/AlertBanner.test.ts:19` -- `bg-green-500/10`

These tests assert against hardcoded class names rather than design system utilities. When the components are fixed to use CSS variables, these tests will need updating.

---

## Priority Summary

| Severity | Count | Impact |
|----------|-------|--------|
| P0 (Broken) | 0 | -- |
| P1 (Light mode broken) | 18 | Colors will be wrong/illegible in light mode |
| P2 (Inconsistent) | 11 | Same pattern done differently across pages |
| P3 (Polish) | 8 | Minor spacing, weight, animation tweaks |
| **Total** | **37** | |

### Recommended Fix Order

1. **Define missing tokens** (warning, success) in `app.css` with light/dark variants -- unblocks all P1 fixes
2. **Fix required-field asterisks** (C-01) -- highest instance count, easy global find-replace
3. **Fix AlertBanner and DuplicateContactBanner** (C-08, C-09) -- components used everywhere
4. **Fix LeadScoreBadge** (C-03) -- used across multiple pages
5. **Replace ad-hoc buttons** (B-01, B-02) -- use system `btn-primary`/`btn-ghost`
6. **Standardize date formatting** (D-01, D-02) -- replace raw calls with `formatDate()`/`formatDateTime()`
7. **Fix container widths** (L-01 through L-04) -- decide if humans/opportunities deserve `max-w-7xl`
8. **Fix all remaining hardcoded colors** (C-05 through C-18)
9. **Polish pass** (T-01, T-02, T-03, B-03, I-01, I-02)
