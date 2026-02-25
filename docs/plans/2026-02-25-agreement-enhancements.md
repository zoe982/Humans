# Agreement Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the activation date picker bug, add file upload to agreement creation, and add inline agreement creation from Humans and Accounts detail pages.

**Architecture:** Three independent fixes/features. (1) Fix GlassDatePicker reactivity so dates persist in forms. (2) Add file upload to `/agreements/new` with a two-step server action (create agreement, then upload document). (3) Add `addAgreement` inline forms to Human and Account detail pages following the existing `addForm` snippet pattern. Both pages need `agreement-types` config data added to their data loading.

**Tech Stack:** SvelteKit, Svelte 5 ($state/$derived/$effect), bits-ui Calendar, R2 document upload API, Drizzle ORM

---

### Task 1: Fix GlassDatePicker Activation Date Bug

**Files:**
- Modify: `apps/web/src/lib/components/GlassDatePicker.svelte`

**Context:** The `GlassDatePicker` uses a `selfUpdate` plain `let` variable as a guard in a `$effect`. In Svelte 5, `$effect` only tracks `$state` and `$derived` — plain variables are read by closure but don't trigger re-runs. The popover also doesn't auto-close after date selection, which makes UX confusing.

**Step 1: Fix the component**

Replace the entire `<script>` section. Key changes:
- Remove the `selfUpdate` guard pattern entirely — it's error-prone with Svelte 5 reactivity
- Instead, use a simpler approach: the `$effect` only runs to sync external `value` changes into `selectedDate`. Internal changes (from calendar clicks) set `selectedDate` directly and call `onchange`.
- Add `popoverOpen = false` after date selection to auto-close the calendar.

```svelte
<script lang="ts">
  import * as Popover from "$lib/components/ui/popover";
  import { Calendar } from "$lib/components/ui/calendar";
  import { CalendarDate, type DateValue, today, getLocalTimeZone } from "@internationalized/date";
  import CalendarDays from "lucide-svelte/icons/calendar-days";

  type Props = {
    name: string;
    id?: string;
    value?: string;
    onchange?: (value: string) => void;
  };

  let { name, id, value, onchange }: Props = $props();

  let selectedDate = $state<DateValue | undefined>(undefined);
  let popoverOpen = $state(false);

  // Track the last value we emitted to avoid re-parsing our own output
  let lastEmitted = $state("");

  // Sync external value prop into internal selectedDate
  $effect(() => {
    const v = value ?? "";
    if (v === lastEmitted) return;
    if (v) {
      const parts = v.split("T")[0].split("-");
      if (parts.length === 3) {
        selectedDate = new CalendarDate(Number(parts[0]), Number(parts[1]), Number(parts[2]));
      }
    } else {
      selectedDate = undefined;
    }
  });

  function buildIso(date: DateValue | undefined): string {
    if (!date) return "";
    const y = date.year;
    const m = String(date.month).padStart(2, "0");
    const d = String(date.day).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const isoString = $derived(buildIso(selectedDate));

  const displayText = $derived.by(() => {
    if (!selectedDate) return "";
    const d = new Date(`${isoString}T00:00:00`);
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  });

  function handleDateSelect(newDate: DateValue | undefined) {
    selectedDate = newDate;
    const iso = buildIso(newDate);
    if (iso !== (value ?? "")) {
      lastEmitted = iso;
      onchange?.(iso);
    }
    popoverOpen = false;
  }
</script>
```

The template stays the same (hidden input, popover, calendar). No changes needed there.

**Step 2: Verify manually**

Open `/agreements/new`, pick an activation date. The calendar should close, the date should display, and submitting the form should include the date.

**Step 3: Commit**

```bash
git add apps/web/src/lib/components/GlassDatePicker.svelte
git commit -m "fix: GlassDatePicker reactivity - use $state for selfUpdate guard, auto-close popover"
```

---

### Task 2: Add File Upload to /agreements/new

**Files:**
- Modify: `apps/web/src/routes/agreements/new/+page.svelte`
- Modify: `apps/web/src/routes/agreements/new/+page.server.ts`

**Context:** The agreement detail page already has document upload via `/api/documents/upload`. We need to add the same capability to the creation flow. Since the agreement doesn't exist yet when the form is submitted, the server action must: (1) create the agreement, (2) upload the file using the new agreement's ID, (3) redirect.

**Step 1: Update the server action to handle file upload**

In `apps/web/src/routes/agreements/new/+page.server.ts`, modify the `create` action:

```typescript
import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { fetchList, fetchConfigs, failFromApi } from "$lib/server/api";

function isDataWithId(value: unknown): value is { data: { id: string } } {
  return typeof value === "object" && value !== null && "data" in value;
}

export const load = async ({ locals, cookies }: RequestEvent): Promise<{ allHumans: unknown[]; allAccounts: unknown[]; agreementTypes: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";

  const [allHumans, allAccounts, configs] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/humans`, sessionToken),
    fetchList(`${PUBLIC_API_URL}/api/accounts`, sessionToken),
    fetchConfigs(sessionToken, ["agreement-types"]),
  ]);

  return {
    allHumans,
    allAccounts,
    agreementTypes: (configs["agreement-types"] as unknown[]) ?? [],
  };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const humanIdRaw = form.get("humanId");
    const accountIdRaw = form.get("accountId");
    const typeIdRaw = form.get("typeId");
    const activationDateRaw = form.get("activationDate");
    const notesRaw = form.get("notes");

    const payload = {
      title: form.get("title"),
      typeId: typeof typeIdRaw === "string" && typeIdRaw !== "" ? typeIdRaw : undefined,
      humanId: typeof humanIdRaw === "string" && humanIdRaw !== "" ? humanIdRaw : undefined,
      accountId: typeof accountIdRaw === "string" && accountIdRaw !== "" ? accountIdRaw : undefined,
      activationDate: typeof activationDateRaw === "string" && activationDateRaw !== "" ? activationDateRaw : undefined,
      notes: typeof notesRaw === "string" && notesRaw !== "" ? notesRaw : undefined,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/agreements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to create agreement");
    }

    const created: unknown = await res.json();
    if (!isDataWithId(created)) {
      return fail(500, { error: "Unexpected response" });
    }

    // Upload file if present
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("entityType", "agreement");
      uploadForm.append("entityId", created.data.id);

      await fetch(`${PUBLIC_API_URL}/api/documents/upload`, {
        method: "POST",
        headers: {
          Cookie: `humans_session=${sessionToken ?? ""}`,
        },
        body: uploadForm,
      });
      // Don't fail the whole creation if upload fails — the agreement exists,
      // user can upload from the detail page
    }

    redirect(302, `/agreements/${created.data.id}`);
  },
};
```

**Step 2: Add file input to the form UI**

In `apps/web/src/routes/agreements/new/+page.svelte`, add a file upload field before the submit button. Add this block after the notes textarea `<div>` and before the `<p>` tag:

```svelte
    <div>
      <label for="file" class="block text-sm font-medium text-text-secondary mb-1">Document (PDF)</label>
      <input
        type="file"
        id="file"
        name="file"
        accept=".pdf,application/pdf"
        class="text-sm text-text-secondary file:mr-2 file:rounded file:border-0 file:bg-glass file:px-3 file:py-1 file:text-sm file:text-text-primary"
      />
    </div>
```

Also add `enctype="multipart/form-data"` to the `<form>` tag (required for file uploads via form submission):

Change: `<form method="POST" action="?/create" class="space-y-6 glass-card p-6">`
To: `<form method="POST" action="?/create" enctype="multipart/form-data" class="space-y-6 glass-card p-6">`

**Step 3: Commit**

```bash
git add apps/web/src/routes/agreements/new/+page.svelte apps/web/src/routes/agreements/new/+page.server.ts
git commit -m "feat: add file upload to agreement creation page"
```

---

### Task 3: Add Inline Agreement Creation on Humans Detail Page

**Files:**
- Modify: `apps/web/src/routes/humans/[id]/+page.server.ts` (add `agreement-types` config fetch + `addAgreement` action)
- Modify: `apps/web/src/routes/humans/[id]/+page.svelte` (add `addForm` snippet to agreements RelatedListTable)

**Step 1: Update server — add agreement-types to config batch and return type**

In `apps/web/src/routes/humans/[id]/+page.server.ts`:

1. Add `agreementTypes: unknown[];` to the return type (line ~33, after `humanAgreements`).

2. Add `"agreement-types"` to the `fetchConfigs` call (line ~63):
   Change: `fetchConfigs(token, ["human-email-labels", "human-phone-labels", "social-id-platforms", "account-human-labels", "human-relationship-labels"])`
   To: `fetchConfigs(token, ["human-email-labels", "human-phone-labels", "social-id-platforms", "account-human-labels", "human-relationship-labels", "agreement-types"])`

3. Extract `agreementTypes` from configs (after line ~74):
   Add: `const agreementTypes = configs["agreement-types"] ?? [];`

4. Add `agreementTypes` to the return object (line ~154):
   Add: `agreementTypes,`

**Step 2: Add `addAgreement` server action**

Add this action to the `actions` object in the same file, following the existing `addEmail` pattern:

```typescript
  addAgreement: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const typeIdVal = formStr(form.get("typeId"));
    const activationDateVal = formStr(form.get("activationDate"));
    const notesVal = formStr(form.get("notes"));

    const payload = {
      title: form.get("title"),
      typeId: typeIdVal !== "" ? typeIdVal : undefined,
      humanId: params.id,
      activationDate: activationDateVal !== "" ? activationDateVal : undefined,
      notes: notesVal !== "" ? notesVal : undefined,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/agreements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to create agreement");
    }

    // Upload file if present
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      const created: unknown = await res.json();
      if (isObjData(created)) {
        const agreementId = (created.data as { id?: string }).id;
        if (agreementId) {
          const uploadForm = new FormData();
          uploadForm.append("file", file);
          uploadForm.append("entityType", "agreement");
          uploadForm.append("entityId", agreementId);

          await fetch(`${PUBLIC_API_URL}/api/documents/upload`, {
            method: "POST",
            headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
            body: uploadForm,
          });
        }
      }
    }

    return { success: true };
  },
```

**IMPORTANT:** The `res.json()` for file upload must be called only if a file is present, AND note that `res.json()` was NOT already consumed (the success path doesn't call `res.json()` for the non-file case — but wait, actually we need the agreement ID for the file upload). Fix: always parse the response to get the agreement ID when a file is present:

Actually, re-reading: the response body can only be consumed once. We need to always parse the response body first, then use the ID for file upload. Corrected action:

```typescript
  addAgreement: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const typeIdVal = formStr(form.get("typeId"));
    const activationDateVal = formStr(form.get("activationDate"));
    const notesVal = formStr(form.get("notes"));

    const payload = {
      title: form.get("title"),
      typeId: typeIdVal !== "" ? typeIdVal : undefined,
      humanId: params.id,
      activationDate: activationDateVal !== "" ? activationDateVal : undefined,
      notes: notesVal !== "" ? notesVal : undefined,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/agreements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    const resBody: unknown = await res.json();

    if (!res.ok) {
      return failFromApi(resBody, res.status, "Failed to create agreement");
    }

    // Upload file if present
    const file = form.get("file");
    if (file instanceof File && file.size > 0 && isObjData(resBody)) {
      const agreementId = (resBody.data as { id?: string }).id;
      if (agreementId) {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        uploadForm.append("entityType", "agreement");
        uploadForm.append("entityId", agreementId);

        await fetch(`${PUBLIC_API_URL}/api/documents/upload`, {
          method: "POST",
          headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
          body: uploadForm,
        });
      }
    }

    return { success: true };
  },
```

**Step 3: Update Svelte component — add agreementTypes data + addForm snippet**

In `apps/web/src/routes/humans/[id]/+page.svelte`:

1. Add `agreementTypes` to the derived data (near line ~168 where other data is derived):
   ```typescript
   const agreementTypes = $derived(data.agreementTypes as ConfigItem[]);
   ```

2. Add agreement type options (near other options like typeOptions):
   ```typescript
   const agreementTypeOptions = $derived(
     agreementTypes.map((t) => ({ value: t.id, label: t.name }))
   );
   ```

3. Add `addLabel="Agreement"` to the Agreements RelatedListTable (line ~1522):
   ```svelte
   <RelatedListTable
     title="Agreements"
     items={humanAgreements}
     ...existing props...
     addLabel="Agreement"
   >
   ```

4. Add the `addForm` snippet after the closing `{/snippet}` of the `row` snippet (line ~1550), before the closing `</RelatedListTable>`:

   ```svelte
       {#snippet addForm()}
         <form method="POST" action="?/addAgreement" enctype="multipart/form-data" class="space-y-3">
           <div class="grid gap-3 sm:grid-cols-2">
             <div>
               <label for="agrTitle" class="block text-sm font-medium text-text-secondary">Title <span class="text-red-400">*</span></label>
               <input id="agrTitle" name="title" type="text" required class="glass-input mt-1 block w-full" placeholder="Agreement title" />
             </div>
             <div>
               <label for="agrType" class="block text-sm font-medium text-text-secondary">Type</label>
               <SearchableSelect options={agreementTypeOptions} name="typeId" id="agrType" emptyOption="None" placeholder="Select type..." />
             </div>
           </div>
           <div class="grid gap-3 sm:grid-cols-2">
             <div>
               <label for="agrDate" class="block text-sm font-medium text-text-secondary">Activation Date</label>
               <GlassDatePicker name="activationDate" id="agrDate" />
             </div>
             <div>
               <label for="agrFile" class="block text-sm font-medium text-text-secondary">Document (PDF)</label>
               <input type="file" id="agrFile" name="file" accept=".pdf,application/pdf" class="text-sm text-text-secondary file:mr-2 file:rounded file:border-0 file:bg-glass file:px-3 file:py-1 file:text-sm file:text-text-primary mt-1" />
             </div>
           </div>
           <div>
             <label for="agrNotes" class="block text-sm font-medium text-text-secondary">Notes</label>
             <textarea id="agrNotes" name="notes" rows={2} class="glass-input mt-1 block w-full" placeholder="Optional notes..."></textarea>
           </div>
           <Button type="submit" size="sm">Create Agreement</Button>
         </form>
       {/snippet}
   ```

5. Make sure `GlassDatePicker` is imported at the top. Check if it's already imported — it is (line ~17 for GlassDateTimePicker but NOT GlassDatePicker). Add the import:
   ```typescript
   import GlassDatePicker from "$lib/components/GlassDatePicker.svelte";
   ```

**Step 4: Commit**

```bash
git add apps/web/src/routes/humans/[id]/+page.server.ts apps/web/src/routes/humans/[id]/+page.svelte
git commit -m "feat: add inline agreement creation from Humans detail page"
```

---

### Task 4: Add Inline Agreement Creation on Accounts Detail Page

**Files:**
- Modify: `apps/web/src/routes/accounts/[id]/+page.server.ts` (add `addAgreement` action)
- Modify: `apps/web/src/routes/accounts/[id]/+page.svelte` (fetch agreement-types in loadData, add `addForm` snippet)

**Context:** The Accounts page uses CLIENT-SIDE data loading (unlike Humans which uses server-side). The load function just returns `{ accountId }`. All data is fetched in `loadData()` via the `api()` helper. Server actions exist for form submissions (addEmail, addPhoneNumber, etc.).

**Step 1: Add `addAgreement` server action**

In `apps/web/src/routes/accounts/[id]/+page.server.ts`, add this action. Note: this file uses `isObjData` from imports (already imported), and `formStr` is already defined locally.

Add to the `actions` object (before the closing `};`):

```typescript
  addAgreement: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";

    const typeIdVal = formStr(form.get("typeId"));
    const activationDateVal = formStr(form.get("activationDate"));
    const notesVal = formStr(form.get("notes"));

    const payload = {
      title: form.get("title"),
      typeId: typeIdVal !== "" ? typeIdVal : undefined,
      accountId: params.id,
      activationDate: activationDateVal !== "" ? activationDateVal : undefined,
      notes: notesVal !== "" ? notesVal : undefined,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/agreements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    const resBody: unknown = await res.json().catch(() => ({}));

    if (!res.ok) {
      return failFromApi(resBody, res.status, "Failed to create agreement");
    }

    // Upload file if present
    const file = form.get("file");
    if (file instanceof File && file.size > 0 && isObjData(resBody)) {
      const agreementId = (resBody.data as { id?: string }).id;
      if (agreementId) {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        uploadForm.append("entityType", "agreement");
        uploadForm.append("entityId", agreementId);

        await fetch(`${PUBLIC_API_URL}/api/documents/upload`, {
          method: "POST",
          headers: { Cookie: `humans_session=${sessionToken}` },
          body: uploadForm,
        });
      }
    }

    return { success: true };
  },
```

**Step 2: Add agreement-types config fetch to client-side loadData**

In `apps/web/src/routes/accounts/[id]/+page.svelte`:

1. Add a `$state` variable for agreement types (near line ~103 where `accountAgreements` is declared):
   ```typescript
   let agreementTypeConfigs = $state<ConfigItem[]>([]);
   ```

2. In the `loadData()` function, add a fetch for agreement-types. Find the section where configs are fetched (the `// 2a: Configs` block). The batch config call currently is:
   ```
   api(`/api/admin/account-config/batch?types=account-types,account-human-labels,account-email-labels,account-phone-labels,social-id-platforms`)
   ```

   Change to:
   ```
   api(`/api/admin/account-config/batch?types=account-types,account-human-labels,account-email-labels,account-phone-labels,social-id-platforms,agreement-types`)
   ```

3. Inside the configs processing block, after the existing config extractions, add:
   ```typescript
   agreementTypeConfigs = (configs["agreement-types"] ?? []) as ConfigItem[];
   ```

4. Add agreement type options derivation:
   ```typescript
   const agreementTypeOptions = $derived(
     agreementTypeConfigs.map((t) => ({ value: t.id, label: t.name }))
   );
   ```

5. Add `addLabel="Agreement"` to the Agreements RelatedListTable (line ~1071).

6. Add the `addForm` snippet to the Agreements RelatedListTable (after the `row` snippet, before `</RelatedListTable>`):

   ```svelte
       {#snippet addForm()}
         <form method="POST" action="?/addAgreement" enctype="multipart/form-data" class="space-y-3">
           <div class="grid gap-3 sm:grid-cols-2">
             <div>
               <label for="agrTitle" class="block text-sm font-medium text-text-secondary">Title <span class="text-red-400">*</span></label>
               <input id="agrTitle" name="title" type="text" required class="glass-input mt-1 block w-full" placeholder="Agreement title" />
             </div>
             <div>
               <label for="agrType" class="block text-sm font-medium text-text-secondary">Type</label>
               <SearchableSelect options={agreementTypeOptions} name="typeId" id="agrType" emptyOption="None" placeholder="Select type..." />
             </div>
           </div>
           <div class="grid gap-3 sm:grid-cols-2">
             <div>
               <label for="agrDate" class="block text-sm font-medium text-text-secondary">Activation Date</label>
               <GlassDatePicker name="activationDate" id="agrDate" />
             </div>
             <div>
               <label for="agrFile" class="block text-sm font-medium text-text-secondary">Document (PDF)</label>
               <input type="file" id="agrFile" name="file" accept=".pdf,application/pdf" class="text-sm text-text-secondary file:mr-2 file:rounded file:border-0 file:bg-glass file:px-3 file:py-1 file:text-sm file:text-text-primary mt-1" />
             </div>
           </div>
           <div>
             <label for="agrNotes" class="block text-sm font-medium text-text-secondary">Notes</label>
             <textarea id="agrNotes" name="notes" rows={2} class="glass-input mt-1 block w-full" placeholder="Optional notes..."></textarea>
           </div>
           <Button type="submit" size="sm">Create Agreement</Button>
         </form>
       {/snippet}
   ```

7. Add GlassDatePicker import at the top of the script:
   ```typescript
   import GlassDatePicker from "$lib/components/GlassDatePicker.svelte";
   ```

8. After the form submits (via SvelteKit progressive enhancement), the page will call `loadData()` again to refresh the agreements list. The `invalidateAll` from SvelteKit form handling triggers the `onMount` effect.

**Step 3: Commit**

```bash
git add apps/web/src/routes/accounts/[id]/+page.server.ts apps/web/src/routes/accounts/[id]/+page.svelte
git commit -m "feat: add inline agreement creation from Accounts detail page"
```

---

### Task 5: Verify & Deploy

**Step 1: Run typecheck**

```bash
cd /Users/zoemarsico/Documents/Humans && pnpm turbo typecheck 2>&1 | tail -n 40
```

**Step 2: Run lint**

```bash
cd /Users/zoemarsico/Documents/Humans && pnpm turbo lint 2>&1 | tail -n 40
```

**Step 3: Fix any issues from lint/typecheck**

Delegate to frontend-engineer subagent (sonnet) if needed.

**Step 4: Build and deploy**

```bash
cd /Users/zoemarsico/Documents/Humans/apps/web && pnpm build 2>&1 | tail -n 20
cd /Users/zoemarsico/Documents/Humans/apps/web && npx wrangler pages deploy --commit-dirty=true --branch=main
```

**Step 5: Manual verification**

1. Go to `/agreements/new` — verify date picker works, file upload field present
2. Go to a Human detail page — verify "Add Agreement" button appears, form works with date + file
3. Go to an Account detail page — same verification
4. Create an agreement with a file from each location — verify the document appears on the agreement detail page
