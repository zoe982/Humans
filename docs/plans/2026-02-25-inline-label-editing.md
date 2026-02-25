# Inline Label Editing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow admins to rename config labels inline instead of delete-and-recreate.

**Architecture:** The API PATCH endpoint already exists and is tested. We add 9 `rename*` SvelteKit form actions (one per config type) to `+page.server.ts`, then update `+page.svelte` to swap label text for an input on click.

**Tech Stack:** SvelteKit form actions, Svelte 5 `$state` runes, `use:enhance`

---

### Task 1: Write failing tests for rename form actions

**Files:**
- Modify: `apps/web/test/routes/admin/account-config/+page.server.test.ts`

**Step 1: Write the failing tests**

Add a new `describe` block at the end of the `actions` describe, after the last `delete*` block. Add tests for all 9 rename actions. The pattern is identical for each — here's the template using `renameAccountType` as the example:

```typescript
    describe("renameAccountType", () => {
      it("renames an account type successfully", async () => {
        mockFetch = createMockFetch({
          "account-types": { body: { success: true } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "type-1", name: "Updated Name" } });
        const result = await actions.renameAccountType(event as any);

        expect(result).toEqual({ success: true });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("account-types/type-1"),
          expect.objectContaining({ method: "PATCH" }),
        );
      });

      it("returns failure when API errors", async () => {
        mockFetch = createMockFetch({
          "account-types": { status: 400, body: { error: "Invalid name" } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "type-1", name: "" } });
        const result = await actions.renameAccountType(event as any);

        expect(isActionFailure(result)).toBe(true);
        if (isActionFailure(result)) {
          expect(result.status).toBe(400);
        }
      });
    });
```

Repeat this pattern for all 9 config types, substituting:

| Action name | URL pattern | Mock URL key |
|---|---|---|
| `renameAccountType` | `account-types/type-1` | `account-types` |
| `renameHumanLabel` | `account-human-labels/label-1` | `account-human-labels` |
| `renameEmailLabel` | `account-email-labels/el-1` | `account-email-labels` |
| `renamePhoneLabel` | `account-phone-labels/pl-1` | `account-phone-labels` |
| `renameHumanEmailLabel` | `human-email-labels/hel-1` | `human-email-labels` |
| `renameHumanPhoneLabel` | `human-phone-labels/hpl-1` | `human-phone-labels` |
| `renameOpportunityHumanRole` | `opportunity-human-roles/role-1` | `opportunity-human-roles` |
| `renameHumanRelationshipLabel` | `human-relationship-labels/hrl-1` | `human-relationship-labels` |
| `renameAgreementType` | `agreement-types/at-1` | `agreement-types` |

**Step 2: Run tests to verify they fail**

Run: `cd /Users/zoemarsico/Documents/Humans/apps/web && pnpm test run test/routes/admin/account-config/+page.server.test.ts 2>&1 | tail -n 40`
Expected: FAIL — `actions.renameAccountType is not a function` (or similar)

---

### Task 2: Implement rename form actions

**Files:**
- Modify: `apps/web/src/routes/admin/account-config/+page.server.ts`

**Step 1: Add a helper function**

The existing code has 27 copy-pasted action handlers. Rather than adding 9 more copies, add a `renameConfig` helper at the top (after the existing `getFormString` helper) and use it for all rename actions:

```typescript
async function renameConfig(
  request: Request,
  cookies: { get: (name: string) => string | undefined },
  configType: string,
): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> {
  const form = await request.formData();
  const sessionToken = cookies.get("humans_session") ?? "";
  const id = getFormString(form, "id");
  const name = getFormString(form, "name");

  const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/${configType}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: `humans_session=${sessionToken}` },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const resBody: unknown = await res.json().catch(() => ({}));
    return failFromApi(resBody, res.status, "Failed to rename");
  }
  return { success: true };
}
```

**Step 2: Add the 9 rename actions to the `actions` object**

Add these at the end of the `actions` object (before the closing `}`):

```typescript
  renameAccountType: async ({ request, cookies }: RequestEvent) =>
    renameConfig(request, cookies, "account-types"),

  renameHumanLabel: async ({ request, cookies }: RequestEvent) =>
    renameConfig(request, cookies, "account-human-labels"),

  renameEmailLabel: async ({ request, cookies }: RequestEvent) =>
    renameConfig(request, cookies, "account-email-labels"),

  renamePhoneLabel: async ({ request, cookies }: RequestEvent) =>
    renameConfig(request, cookies, "account-phone-labels"),

  renameHumanEmailLabel: async ({ request, cookies }: RequestEvent) =>
    renameConfig(request, cookies, "human-email-labels"),

  renameHumanPhoneLabel: async ({ request, cookies }: RequestEvent) =>
    renameConfig(request, cookies, "human-phone-labels"),

  renameOpportunityHumanRole: async ({ request, cookies }: RequestEvent) =>
    renameConfig(request, cookies, "opportunity-human-roles"),

  renameHumanRelationshipLabel: async ({ request, cookies }: RequestEvent) =>
    renameConfig(request, cookies, "human-relationship-labels"),

  renameAgreementType: async ({ request, cookies }: RequestEvent) =>
    renameConfig(request, cookies, "agreement-types"),
```

**Step 3: Run tests to verify they pass**

Run: `cd /Users/zoemarsico/Documents/Humans/apps/web && pnpm test run test/routes/admin/account-config/+page.server.test.ts 2>&1 | tail -n 40`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add apps/web/src/routes/admin/account-config/+page.server.ts apps/web/test/routes/admin/account-config/+page.server.test.ts
git commit -m "feat: add rename form actions for all admin config types"
```

---

### Task 3: Update Svelte component for inline editing

**Files:**
- Modify: `apps/web/src/routes/admin/account-config/+page.svelte`

**Step 1: Add editing state and helpers to the `<script>` block**

After the existing `$derived` declarations, add:

```typescript
  let editingId: string | null = $state(null);
  let editingName: string = $state("");

  function startEdit(item: ConfigItem) {
    editingId = item.id;
    editingName = item.name;
  }

  function cancelEdit() {
    editingId = null;
    editingName = "";
  }
```

**Step 2: Add the `use:enhance` import**

Add to the top of the `<script>` block:

```typescript
  import { enhance } from "$app/forms";
```

**Step 3: Update each config card's item row**

For every `{#each}` block, replace the existing item row pattern. Here's the Account Types card as example — the current code:

```svelte
{#each accountTypes as item (item.id)}
  <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
    <span class="text-sm text-text-primary">{item.name}</span>
    <form method="POST" action="?/deleteAccountType">
      <input type="hidden" name="id" value={item.id} />
      <button type="submit" class="text-destructive-foreground hover:opacity-80 text-sm">Remove</button>
    </form>
  </div>
{/each}
```

Replace with:

```svelte
{#each accountTypes as item (item.id)}
  <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
    {#if editingId === item.id}
      <form method="POST" action="?/renameAccountType" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="flex items-center gap-2 flex-1 mr-2">
        <input type="hidden" name="id" value={item.id} />
        <input
          name="name"
          type="text"
          required
          bind:value={editingName}
          class="glass-input flex-1 px-2 py-1 text-sm"
          onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") cancelEdit(); }}
        />
        <button type="submit" class="text-accent hover:opacity-80 text-sm">Save</button>
        <button type="button" onclick={cancelEdit} class="text-text-muted hover:opacity-80 text-sm">Cancel</button>
      </form>
    {:else}
      <button type="button" onclick={() => startEdit(item)} class="text-sm text-text-primary hover:text-accent transition-colors text-left flex-1 mr-2" title="Click to edit">
        {item.name}
      </button>
      <form method="POST" action="?/deleteAccountType">
        <input type="hidden" name="id" value={item.id} />
        <button type="submit" class="text-destructive-foreground hover:opacity-80 text-sm">Remove</button>
      </form>
    {/if}
  </div>
{/each}
```

Apply this same pattern to all 9 config card blocks. The only thing that changes per card is the `action="?/rename*"` value:

| Card | Rename action |
|---|---|
| Account Types | `?/renameAccountType` |
| Human-Account Role Labels | `?/renameHumanLabel` |
| Account Email Labels | `?/renameEmailLabel` |
| Account Phone Labels | `?/renamePhoneLabel` |
| Human Email Labels | `?/renameHumanEmailLabel` |
| Human Phone Labels | `?/renameHumanPhoneLabel` |
| Opportunity Human Roles | `?/renameOpportunityHumanRole` |
| Agreement Types | `?/renameAgreementType` |
| Human Relationship Labels | `?/renameHumanRelationshipLabel` |

**Step 4: Run full web test suite**

Run: `cd /Users/zoemarsico/Documents/Humans/apps/web && pnpm test run 2>&1 | tail -n 40`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/web/src/routes/admin/account-config/+page.svelte
git commit -m "feat: add inline editing UI for admin config labels"
```

---

### Task 4: Lint, typecheck, and verify

**Step 1: Run lint + typecheck**

Run: `cd /Users/zoemarsico/Documents/Humans && pnpm turbo lint --filter=web 2>&1 | tail -n 40`
Run: `cd /Users/zoemarsico/Documents/Humans && pnpm turbo typecheck --filter=web 2>&1 | tail -n 40`

Fix any issues.

**Step 2: Run web test suite with coverage**

Run: `cd /Users/zoemarsico/Documents/Humans/apps/web && pnpm test run --coverage 2>&1 | tail -n 80`

Verify coverage stays above 95% threshold.
