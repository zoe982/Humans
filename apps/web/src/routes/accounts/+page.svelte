<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { Search } from "lucide-svelte";
  import { statusColors } from "$lib/constants/colors";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type AccountType = { id: string; name: string };
  type Account = {
    id: string;
    displayId: string;
    name: string;
    status: string;
    types: AccountType[];
    createdAt: string;
  };

  const accounts = $derived(data.accounts as Account[]);

  let search = $state("");

  const filtered = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      a.displayId.toLowerCase().includes(q) ||
      a.status.toLowerCase().includes(q) ||
      a.types.some((t) => t.name.toLowerCase().includes(q))
    );
  });

  let pendingDeleteId = $state<string | null>(null);
  let deleteFormEl = $state<HTMLFormElement>();
</script>

<svelte:head>
  <title>Accounts - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Accounts" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounts" }]}>
    {#snippet action()}
      <a href="/accounts/new" class="btn-primary">Add Account</a>
    {/snippet}
  </PageHeader>

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <!-- Search -->
  <div class="mt-4 mb-6">
    <div class="relative max-w-md">
      <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      <input type="text" bind:value={search} placeholder="Search accounts..." class="glass-input w-full pl-9 pr-3 py-2 text-sm" />
    </div>
  </div>

  <!-- Mobile card view -->
  <div class="sm:hidden space-y-3">
    {#each filtered as account (account.id)}
      <a href="/accounts/{account.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
        <span class="font-mono text-xs text-text-muted">{account.displayId}</span>
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-accent">{account.name}</span>
          <StatusBadge status={account.status ?? "open"} colorMap={statusColors} />
        </div>
        <div class="flex gap-1 flex-wrap">
          {#each account.types as t}
            <span class="glass-badge text-xs bg-[rgba(168,85,247,0.15)] text-purple-300">{t.name}</span>
          {/each}
        </div>
        {#if data.userRole === "admin"}
          <div class="mt-2 flex justify-end">
            <button type="button" class="text-red-400 hover:text-red-300 text-xs" onclick={(e) => { e.preventDefault(); pendingDeleteId = account.id; }}>Delete</button>
          </div>
        {/if}
      </a>
    {:else}
      <div class="glass-card p-6 text-center text-sm text-text-muted">No accounts found.</div>
    {/each}
  </div>

  <!-- Desktop table view -->
  <div class="glass-card overflow-hidden hidden sm:block">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th scope="col">ID</th>
          <th scope="col">Name</th>
          <th scope="col">Status</th>
          <th scope="col">Types</th>
          <th scope="col">Created</th>
          {#if data.userRole === "admin"}
            <th scope="col">Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each filtered as account (account.id)}
          <tr class="glass-row-hover">
            <td class="font-mono text-sm">
              <a href="/accounts/{account.id}" class="text-accent hover:text-cyan-300">{account.displayId}</a>
            </td>
            <td class="font-medium">
              <a href="/accounts/{account.id}" class="text-accent hover:text-cyan-300">{account.name}</a>
            </td>
            <td>
              <StatusBadge status={account.status ?? "open"} colorMap={statusColors} />
            </td>
            <td>
              <div class="flex gap-1 flex-wrap">
                {#each account.types as t}
                  <span class="glass-badge bg-[rgba(168,85,247,0.15)] text-purple-300">
                    {t.name}
                  </span>
                {/each}
              </div>
            </td>
            <td class="text-text-muted">{new Date(account.createdAt).toLocaleDateString()}</td>
            {#if data.userRole === "admin"}
              <td>
                <button type="button" class="text-red-400 hover:text-red-300 text-sm" onclick={() => { pendingDeleteId = account.id; }}>Delete</button>
              </td>
            {/if}
          </tr>
        {:else}
          <tr>
            <td colspan={data.userRole === "admin" ? 6 : 5} class="px-6 py-8 text-center text-sm text-text-muted">No accounts found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden">
  <input type="hidden" name="id" value={pendingDeleteId ?? ""} />
</form>

<ConfirmDialog
  open={pendingDeleteId !== null}
  message="Are you sure you want to delete this account? This cannot be undone."
  onConfirm={() => { deleteFormEl?.requestSubmit(); pendingDeleteId = null; }}
  onCancel={() => { pendingDeleteId = null; }}
/>
