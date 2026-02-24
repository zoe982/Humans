# Booking Request: Closed - Converted Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Closed - Converted" status to Website Booking Requests so that when a lead is converted to a Human, the booking request reflects this.

**Architecture:** The status `closed_converted` is added to the shared validator, UI labels/colors, and the status dropdown. A new API endpoint `POST /api/humans/:id/convert-from-booking-request` links the booking request to a human, sets Supabase status to `closed_converted`, and re-parents activities. The existing `convertToHuman` server action is fixed to call this new endpoint instead of the route signup one.

**Tech Stack:** Zod validators (packages/shared), Hono API routes (apps/api), SvelteKit server actions + Svelte 5 components (apps/web), Supabase (bookings table), D1/Drizzle (human_website_booking_requests junction, activities)

---

### Task 1: Add `closed_converted` to the shared validator

**Files:**
- Modify: `packages/shared/src/validators/website-booking-requests.ts:3-7`
- Test: `packages/shared/src/validators/website-booking-requests.test.ts` (if exists, otherwise create)

**Step 1: Check for existing test file**

Run: `ls packages/shared/src/validators/website-booking-requests.test.ts 2>/dev/null || echo "no test file"`

**Step 2: Write the failing test**

If the test file exists, add to it. Otherwise create it. The test verifies `closed_converted` is accepted by `updateWebsiteBookingRequestSchema`:

```ts
import { describe, it, expect } from "vitest";
import {
  websiteBookingRequestStatuses,
  updateWebsiteBookingRequestSchema,
} from "./website-booking-requests";

describe("websiteBookingRequestStatuses", () => {
  it("includes closed_converted", () => {
    expect(websiteBookingRequestStatuses).toContain("closed_converted");
  });
});

describe("updateWebsiteBookingRequestSchema", () => {
  it("accepts closed_converted status", () => {
    const result = updateWebsiteBookingRequestSchema.parse({ status: "closed_converted" });
    expect(result.status).toBe("closed_converted");
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd packages/shared && pnpm test run src/validators/website-booking-requests.test.ts 2>&1 | tail -n 20`
Expected: FAIL — `closed_converted` is not in the enum

**Step 4: Add `closed_converted` to the statuses array**

In `packages/shared/src/validators/website-booking-requests.ts`, change line 3-7:

```ts
export const websiteBookingRequestStatuses = [
  "confirmed",
  "closed_cancelled",
  "closed_no_response",
  "closed_converted",
] as const;
```

**Step 5: Run test to verify it passes**

Run: `cd packages/shared && pnpm test run src/validators/website-booking-requests.test.ts 2>&1 | tail -n 20`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/shared/src/validators/website-booking-requests.ts packages/shared/src/validators/website-booking-requests.test.ts
git commit -m "feat: add closed_converted status to website booking request validator"
```

---

### Task 2: Add UI labels and colors for `closed_converted`

**Files:**
- Modify: `apps/web/src/lib/constants/labels.ts:44-48`
- Modify: `apps/web/src/lib/constants/colors.ts:34-38`

**Step 1: Add the label**

In `apps/web/src/lib/constants/labels.ts`, change `bookingRequestStatusLabels`:

```ts
export const bookingRequestStatusLabels: Record<string, string> = {
  confirmed: "Confirmed",
  closed_cancelled: "Cancelled",
  closed_no_response: "No Response",
  closed_converted: "Converted",
};
```

**Step 2: Add the color**

In `apps/web/src/lib/constants/colors.ts`, change `bookingRequestStatusColors`:

```ts
export const bookingRequestStatusColors: Record<string, string> = {
  confirmed: "badge-green",
  closed_cancelled: "badge-red",
  closed_no_response: "badge-yellow",
  closed_converted: "badge-green",
};
```

**Step 3: Commit**

```bash
git add apps/web/src/lib/constants/labels.ts apps/web/src/lib/constants/colors.ts
git commit -m "feat: add Converted label and color for booking request status"
```

---

### Task 3: Add `closed_converted` to the detail page status dropdown and list page color map

**Files:**
- Modify: `apps/web/src/routes/leads/website-booking-requests/[id]/+page.svelte:127`
- Modify: `apps/web/src/routes/leads/website-booking-requests/+page.svelte:66-69,146-149`

**Step 1: Add to the status dropdown options on the detail page**

In `apps/web/src/routes/leads/website-booking-requests/[id]/+page.svelte`, change the `statusOptions` prop on `RecordManagementBar` (line 127):

```svelte
statusOptions={["confirmed", "closed_cancelled", "closed_no_response", "closed_converted"]}
```

**Step 2: Add "Converted" to the inline colorMap on the list page**

The list page (`+page.svelte`) has inline `colorMap` objects that map display labels to CSS classes. Add the `"Converted"` entry to both the mobile card view (around line 66) and desktop table view (around line 146):

Mobile (line 66-69):
```svelte
<StatusBadge status={bookingRequestStatusLabels[booking.status ?? ""] ?? booking.status ?? "—"} colorMap={{
  "Confirmed": "badge-green",
  "Cancelled": "badge-red",
  "No Response": "badge-yellow",
  "Converted": "badge-green",
}} />
```

Desktop (line 146-149):
```svelte
<StatusBadge status={bookingRequestStatusLabels[booking.status ?? ""] ?? booking.status ?? "—"} colorMap={{
  "Confirmed": "badge-green",
  "Cancelled": "badge-red",
  "No Response": "badge-yellow",
  "Converted": "badge-green",
}} />
```

**Step 3: Commit**

```bash
git add apps/web/src/routes/leads/website-booking-requests/[id]/+page.svelte apps/web/src/routes/leads/website-booking-requests/+page.svelte
git commit -m "feat: add closed_converted to booking request status dropdown and list"
```

---

### Task 4: Create the API endpoint for converting a booking request

**Files:**
- Modify: `apps/api/src/routes/humans.ts:129-158` (add new route after the existing `convert-from-signup` route)
- Test: `apps/api/test/routes/humans.test.ts` (add integration test)

**Step 1: Write the failing integration test**

Check what pattern the existing convert-from-signup tests use and mirror it. The test should:
1. Create a human
2. POST to `/api/humans/:id/convert-from-booking-request` with `{ websiteBookingRequestId: "<uuid>" }`
3. Assert 200 response with `link` and `status: "closed_converted"`

Note: Supabase calls are external and will need the integration test to mock or the test to focus on the D1 side. Follow existing patterns in the test file.

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm test run test/routes/humans.test.ts 2>&1 | tail -n 40`
Expected: FAIL — route not found / 404

**Step 3: Add the route**

In `apps/api/src/routes/humans.ts`, add after the `convert-from-signup` route (after line 158):

```ts
// Convert from booking request: link booking, update Supabase status, re-parent activities
humanRoutes.post(
  "/api/humans/:id/convert-from-booking-request",
  requirePermission("manageHumans"),
  async (c) => {
    const body: unknown = await c.req.json();
    const data = linkWebsiteBookingRequestSchema.parse(body);
    const db = c.get("db");
    const supabase = c.get("supabase");
    const humanId = c.req.param("id");

    const link = await linkWebsiteBookingRequest(db, humanId, data.websiteBookingRequestId);

    const { error: supaError } = await supabase
      .from("bookings")
      .update({ status: "closed_converted" })
      .eq("id", data.websiteBookingRequestId);

    if (supaError !== null) {
      throw internal(ERROR_CODES.SUPABASE_ERROR, `Supabase update failed: ${supaError.message}`);
    }

    await db
      .update(activities)
      .set({ humanId, updatedAt: new Date().toISOString() })
      .where(eq(activities.websiteBookingRequestId, data.websiteBookingRequestId));

    return c.json({ data: { link, status: "closed_converted" } });
  },
);
```

All imports (`linkWebsiteBookingRequestSchema`, `linkWebsiteBookingRequest`, `eq`, `activities`, `internal`, `ERROR_CODES`) are already imported at the top of the file.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pnpm test run test/routes/humans.test.ts 2>&1 | tail -n 40`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/routes/humans.ts apps/api/test/routes/humans.test.ts
git commit -m "feat: add convert-from-booking-request API endpoint"
```

---

### Task 5: Fix the `convertToHuman` server action

**Files:**
- Modify: `apps/web/src/routes/leads/website-booking-requests/[id]/+page.server.ts:127-147`

**Step 1: Write the failing test**

Check if a server test file exists for this page. If not, create one at `apps/web/test/routes/leads/website-booking-requests/[id]/page.server.test.ts`. The test should verify:
1. The `convertToHuman` action calls the correct endpoint (`/api/humans/:id/convert-from-booking-request`)
2. It sends `{ websiteBookingRequestId: params.id }` in the body

Follow the existing `mockEvent` + `createMockFetch` pattern from `apps/web/test/helpers.ts`.

**Step 2: Run the test to verify it fails**

Expected: FAIL — the action still calls `convert-from-signup`

**Step 3: Fix the server action**

In `apps/web/src/routes/leads/website-booking-requests/[id]/+page.server.ts`, change the `convertToHuman` action (lines 127-147):

Change:
```ts
const res = await fetch(`${PUBLIC_API_URL}/api/humans/${humanId}/convert-from-signup`, {
```
To:
```ts
const res = await fetch(`${PUBLIC_API_URL}/api/humans/${humanId}/convert-from-booking-request`, {
```

Change:
```ts
body: JSON.stringify({ routeSignupId: params.id }),
```
To:
```ts
body: JSON.stringify({ websiteBookingRequestId: params.id }),
```

**Step 4: Run the test to verify it passes**

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/routes/leads/website-booking-requests/[id]/+page.server.ts apps/web/test/routes/leads/website-booking-requests/
git commit -m "fix: convertToHuman action now calls booking-request endpoint"
```

---

### Task 6: Run full quality gate

**Step 1: Run the quality gate**

Run: `cd /Users/zoemarsico/Documents/Humans && pnpm quality-gate 2>&1 | tail -n 80`

**Step 2: Fix any issues**

Address lint, type, or coverage failures.

**Step 3: Final commit if needed**

```bash
git add -A
git commit -m "chore: quality gate fixes for booking request closed-converted"
```
