<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { ROLE_OPTIONS } from "$lib/constants/labels";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Colleague = {
    id: string;
    email: string;
    firstName: string;
    middleNames: string | null;
    lastName: string;
    name: string;
    role: string;
    isActive: boolean;
    googleId: string | null;
    createdAt: string;
  };

  const colleagues = $derived(data.colleagues as Colleague[]);
  let showInvite = $state(false);

  const roleColors: Record<string, string> = {
    admin: "bg-[rgba(168,85,247,0.15)] text-purple-300",
    manager: "bg-[rgba(59,130,246,0.15)] text-blue-300",
    agent: "bg-[rgba(34,197,94,0.15)] text-green-300",
    viewer: "bg-glass text-text-secondary",
  };
</script>

<svelte:head>
  <title>Colleagues - Admin - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Colleague Management"
    breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Colleagues" }]}
  >
    {#snippet action()}
      <button
        onclick={() => { showInvite = !showInvite; }}
        class="btn-primary"
      >
        Invite Colleague
      </button>
    {/snippet}
  </PageHeader>

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}
  {#if form?.success}
    <AlertBanner type="success" message="Action completed successfully." />
  {/if}

  {#if showInvite}
    <div class="glass-card p-6 mb-6">
      <h2 class="mb-4 text-lg font-semibold text-text-primary">Invite New Colleague</h2>
      <form method="POST" action="?/invite" class="grid gap-4 sm:grid-cols-4">
        <div>
          <label for="firstName" class="block text-sm font-medium text-text-secondary mb-1">First Name</label>
          <input
            id="firstName" name="firstName" type="text" required
            class="glass-input block w-full px-3 py-2 text-sm"
            placeholder="Jane"
          />
        </div>
        <div>
          <label for="middleNames" class="block text-sm font-medium text-text-secondary mb-1">Middle Names</label>
          <input
            id="middleNames" name="middleNames" type="text"
            class="glass-input block w-full px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </div>
        <div>
          <label for="lastName" class="block text-sm font-medium text-text-secondary mb-1">Last Name</label>
          <input
            id="lastName" name="lastName" type="text" required
            class="glass-input block w-full px-3 py-2 text-sm"
            placeholder="Smith"
          />
        </div>
        <div>
          <label for="email" class="block text-sm font-medium text-text-secondary mb-1">Email</label>
          <input
            id="email" name="email" type="email" required
            class="glass-input block w-full px-3 py-2 text-sm"
            placeholder="jane@example.com"
          />
        </div>
        <div>
          <label for="role" class="block text-sm font-medium text-text-secondary mb-1">Role</label>
          <SearchableSelect
            options={ROLE_OPTIONS}
            name="role"
            id="role"
            value="viewer"
            required={true}
            placeholder="Select role..."
          />
        </div>
        <div class="sm:col-span-3 flex gap-3 items-end">
          <button type="submit" class="btn-primary">Send Invite</button>
          <button type="button" onclick={() => { showInvite = false; }} class="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  {/if}

  <div class="glass-card overflow-hidden">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th scope="col">Colleague</th>
          <th scope="col">Role</th>
          <th scope="col">Status</th>
          <th scope="col">Google</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each colleagues as colleague (colleague.id)}
          <tr class="glass-row-hover">
            <td>
              <div>
                <p class="font-medium">{colleague.name}</p>
                <p class="text-sm text-text-muted">{colleague.email}</p>
              </div>
            </td>
            <td>
              <span class="glass-badge {roleColors[colleague.role] ?? 'bg-glass text-text-secondary'}">
                {colleague.role}
              </span>
            </td>
            <td>
              <span class="glass-badge {colleague.isActive ? 'bg-[rgba(34,197,94,0.15)] text-green-300' : 'bg-[rgba(239,68,68,0.15)] text-red-300'}">
                {colleague.isActive ? "Active" : "Inactive"}
              </span>
            </td>
            <td class="text-text-muted text-sm">
              {colleague.googleId ? "Linked" : "Pending"}
            </td>
            <td>
              <form method="POST" action="?/update" class="flex items-center gap-2">
                <input type="hidden" name="id" value={colleague.id} />
                <select
                  name="role"
                  class="glass-input px-2 py-1 text-xs"
                >
                  {#each ["viewer", "agent", "manager", "admin"] as r}
                    <option value={r} selected={r === colleague.role}>{r}</option>
                  {/each}
                </select>
                <input type="hidden" name="isActive" value={String(!colleague.isActive)} />
                <button
                  type="submit"
                  formaction="?/update"
                  class="btn-ghost text-xs py-1 px-2"
                >
                  Update
                </button>
                <button
                  type="submit"
                  class="text-xs py-1 px-2 rounded-lg {colleague.isActive ? 'btn-danger' : 'bg-[rgba(34,197,94,0.15)] border border-green-500/30 text-green-300'}"
                >
                  {colleague.isActive ? "Deactivate" : "Activate"}
                </button>
              </form>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="px-6 py-8 text-center text-sm text-text-muted">No colleagues found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
