# Inline Label Editing

## Problem
Admin config labels (account types, phone labels, email labels, etc.) can only be created and deleted. Renaming requires deleting the old label and creating a new one, which loses the association with existing records.

## Solution
Add inline editing to all config items on the admin config page. Click a label name to edit it in-place.

## Scope

### Already done (no changes needed)
- **API**: `PATCH /api/admin/account-config/:configType/:id` exists and is integration-tested
- **Shared validators**: `updateConfigItemSchema` already defined in `packages/shared`

### Changes needed

**`+page.server.ts`** — Add 9 `rename*` form actions (one per config type), matching the existing `create*`/`delete*` pattern. Each action reads `id` and `name` from form data, calls PATCH on the API, returns success/failure.

Config types needing rename actions:
1. `renameAccountType` -> `account-types`
2. `renameHumanLabel` -> `account-human-labels`
3. `renameEmailLabel` -> `account-email-labels`
4. `renamePhoneLabel` -> `account-phone-labels`
5. `renameHumanEmailLabel` -> `human-email-labels`
6. `renameHumanPhoneLabel` -> `human-phone-labels`
7. `renameOpportunityHumanRole` -> `opportunity-human-roles`
8. `renameHumanRelationshipLabel` -> `human-relationship-labels`
9. `renameAgreementType` -> `agreement-types`

**`+page.svelte`** — Replace static label text with inline-editable interaction:
- Track `editingId: string | null` in component state
- Click label name -> swap `<span>` for `<input>` pre-filled with current name
- Enter or blur -> submit rename form (if name changed), reset `editingId`
- Escape -> cancel, reset `editingId`
- If name unchanged -> cancel silently (no API call)
- Use `use:enhance` for progressive enhancement

**`+page.server.test.ts`** — Add tests for all 9 rename actions:
- Success case (API returns 200)
- Failure case (API returns error)

## Not in scope
- No API changes
- No DB schema changes
- No new components
- No changes to shared validators
