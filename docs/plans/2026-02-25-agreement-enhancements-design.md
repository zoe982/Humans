# Agreement Enhancements Design

**Date:** 2026-02-25

## Summary

Three enhancements to the agreements feature:
1. Inline agreement creation from Humans and Accounts detail pages
2. Fix activation date picker bug
3. File upload during agreement creation (inline forms + /agreements/new)

## 1. Inline Agreement Creation

### Humans Detail Page (`/routes/humans/[id]`)

Add `{#snippet addForm()}` to the Agreements `RelatedListTable`:
- Hidden input: `humanId` = current human's ID
- Fields: title (required), typeId (SearchableSelect), activationDate (GlassDatePicker), notes (textarea), file (PDF upload)
- Form action: `?/addAgreement` on the humans `+page.server.ts`
- Server action: POST to `/api/agreements` with `humanId` pre-set, then if file present, POST to `/api/documents/upload` with the new agreement's ID
- Refresh via `invalidateAll()`

### Accounts Detail Page (`/routes/accounts/[id]`)

Same pattern:
- Hidden input: `accountId` = current account's ID
- Same fields as above
- Form action: `?/addAgreement` on the accounts `+page.server.ts`
- Same two-step create flow (agreement → document upload)

### Data requirements

Both pages need `agreementTypes` config data. Add to load functions:
- Humans: already fetches configs — add `agreement-types` to the batch
- Accounts: already fetches configs — add `agreement-types` to the batch

## 2. Activation Date Picker Bug

The `GlassDatePicker` component has a `selfUpdate` flag declared as a plain `let` instead of `$state`. In Svelte 5, `$effect` cannot track plain variables — only `$state` and `$derived`. This means the guard against re-parsing the value after an internal update may not work reliably.

**Fix:** Investigate the exact race condition and fix reactivity. Likely involves making `selfUpdate` a `$state` variable or restructuring the effect to avoid the guard altogether.

## 3. File Upload During Agreement Creation

### On /agreements/new page

Add a file input field to the existing form:
- PDF-only (`.pdf, application/pdf`)
- After agreement creation succeeds, upload file to `/api/documents/upload` with `entityType=agreement` and the new agreement's ID
- This requires changing the form action to handle the two-step flow (create agreement → upload file → redirect)

### On inline forms (Humans/Accounts)

Same pattern — file input in the addForm snippet. Two-step: create agreement, then upload document.

### Server-side flow

Since SvelteKit form actions handle `multipart/form-data`, the file can be included in the same form submission. The server action:
1. Extracts the file from formData
2. Creates the agreement via API
3. If file present, uploads to `/api/documents/upload` as a separate fetch
4. Returns success/redirect

No backend API changes needed — the existing `/api/documents/upload` endpoint handles everything.

## Files to modify

- `apps/web/src/lib/components/GlassDatePicker.svelte` — fix reactivity bug
- `apps/web/src/routes/agreements/new/+page.svelte` — add file upload field
- `apps/web/src/routes/agreements/new/+page.server.ts` — handle file upload after creation
- `apps/web/src/routes/humans/[id]/+page.svelte` — add agreement addForm snippet
- `apps/web/src/routes/humans/[id]/+page.server.ts` — add `addAgreement` action, fetch agreement-types config
- `apps/web/src/routes/accounts/[id]/+page.svelte` — add agreement addForm snippet
- `apps/web/src/routes/accounts/[id]/+page.server.ts` — add `addAgreement` action, fetch agreement-types config
