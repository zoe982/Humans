# Incident Report: Blank Accounts Detail Page

**Date**: 2026-02-25
**Severity**: High (page completely blank, no error visible to user)
**Duration**: Unknown (silent failure — no error logging captured it)

## What Happened

The account detail page (`/accounts/[id]`) rendered blank in production. No error appeared in the error log, no console error was reported, and no 500 status was returned. The page simply showed nothing.

## Root Causes (3 converging issues)

### 1. Duplicate Activity IDs

`getAccountDetail()` merged `directActivities` (activities linked to the account) and `humanActivities` (activities linked to humans on the account) without deduplication. When an activity was linked to both the account and a human on that account, the same activity ID appeared twice in the merged array.

Svelte 5's `{#each items as item (item.id)}` throws `each_key_duplicate` when it encounters duplicate keys, crashing the entire component with no recovery.

### 2. Full Table Scans Causing SSR Timeouts

Several service functions loaded entire tables (`db.select().from(humans)`, `db.select().from(accounts)`) to resolve owner names, even when they only needed a handful of rows. As the database grew, these queries caused SSR timeouts, contributing to blank pages.

Affected services: `search.ts`, `geo-interests.ts`, `route-interests.ts`, `humans.ts`, `phone-numbers.ts`, `emails.ts`, `social-ids.ts`, `websites.ts`, `referral-codes.ts`, `discount-codes.ts`.

### 3. Silent Failure — No Error Reporting

The client crashed but no error reached the D1 error log. There was no request timing middleware to flag slow requests, no duplicate ID detection to log the data issue, and the Svelte crash happened client-side with no reporting pipeline.

## What We Fixed

### Immediate Fixes
- **Dedup guard**: Created `assertUniqueIds()` utility that deduplicates arrays by ID, logs warnings, and persists to error log. Applied to all service return paths that merge entity arrays.
- **Full table scan fixes**: Scoped all unbounded SELECTs on high-growth tables (humans, emails, phones, activities, accounts, agreements) with `inArray()` or `.where()` clauses.
- **Svelte key safety**: Changed all `{#each}` blocks from `(item.id)` to index-based `(i)` keys across 24 files (~66 instances).

### Systemic Prevention
- **Request timing middleware**: Logs warnings for requests >2s, persists `SLOW_REQUEST` errors for >5s. Adds `X-Response-Time` header to every response.
- **Unbounded SELECT audit test**: Static analysis test that scans all service files and fails if any high-growth table has `db.select().from(TABLE)` without `.where()`.
- **CLAUDE.md conventions**: Added `{#each}` key convention, API response invariant, and full table scan policy.

## Prevention Checklist for Future Features

1. **New entity arrays**: Always wrap in `assertUniqueIds()` before returning from service functions
2. **New `{#each}` blocks**: Always use index-based keys `(i)`, never `(item.id)`
3. **New queries on high-growth tables**: Always include `.where()` — the audit test will catch violations
4. **New service endpoints**: Request timing middleware automatically covers them
