# Booking Request: Closed - Converted Status

## Problem

Website Booking Requests lack a "Closed - Converted" status. When a booking request lead is converted to a Human record, the booking request should reflect this. Additionally, the existing `convertToHuman` action incorrectly calls the route signup conversion endpoint instead of a booking-request-specific one.

## Design

### 1. Add `closed_converted` status

- **Validator**: Add `"closed_converted"` to `websiteBookingRequestStatuses` in `packages/shared/src/validators/website-booking-requests.ts`
- **Labels**: Add `closed_converted: "Converted"` to `bookingRequestStatusLabels` in `apps/web/src/lib/constants/labels.ts`
- **Colors**: Add `closed_converted: "badge-green"` to `bookingRequestStatusColors` in `apps/web/src/lib/constants/colors.ts`
- **UI dropdown**: Add `"closed_converted"` to `statusOptions` array in `apps/web/src/routes/leads/website-booking-requests/[id]/+page.svelte`

### 2. New API endpoint: `POST /api/humans/:id/convert-from-booking-request`

Located in `apps/api/src/routes/humans.ts`. Accepts `{ websiteBookingRequestId: string }`.

Steps:
1. Call `linkWebsiteBookingRequest(db, humanId, websiteBookingRequestId)` to create the D1 junction record
2. Update Supabase `bookings` table: `status = 'closed_converted'` where `id = websiteBookingRequestId`
3. Re-parent activities: update D1 `activities` where `websiteBookingRequestId` matches, setting `humanId`
4. Return `{ link, status: "closed_converted" }`

### 3. Fix `convertToHuman` server action

In `apps/web/src/routes/leads/website-booking-requests/[id]/+page.server.ts`:
- Change endpoint from `/api/humans/:id/convert-from-signup` to `/api/humans/:id/convert-from-booking-request`
- Send `{ websiteBookingRequestId: params.id }` instead of `{ routeSignupId: params.id }`

### 4. Validator for the new endpoint

Add `linkWebsiteBookingRequestSchema` to `packages/shared/src/validators/website-booking-requests.ts`:
```ts
export const linkWebsiteBookingRequestSchema = z.object({
  websiteBookingRequestId: z.string().min(1),
});
```

## Not changing

- "Convert to Human" UI section layout (search + link, or create new) stays as-is
- `pending_confirmation` stays out of the CRM validator (set by website only)
- The "Create New Human" link already pre-fills from booking data and passes `fromBookingRequest` param
