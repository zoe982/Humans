<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type AccountType = { id: string; name: string };
  type Account = {
    id: string;
    name: string;
    status: string;
    types: AccountType[];
    createdAt: string;
  };

  const accounts = $derived(data.accounts as Account[]);

  const statusColors: Record<string, string> = {
    open: "bg-[rgba(59,130,246,0.15)] text-blue-300",
    active: "bg-[rgba(34,197,94,0.15)] text-green-300",
    closed: "bg-[rgba(239,68,68,0.15)] text-red-300",
  };

  function handleDelete(e: Event) {
    if (!confirm("Are you sure you want to delete this account? This cannot be undone.")) {
      e.preventDefault();
    }
  }
</script>

<svelte:head>
  <title>Accounts - Humans CRM</title>
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

  <div class="glass-card overflow-hidden">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Types</th>
          <th class="hidden sm:table-cell">Created</th>
          {#if data.userRole === "admin"}
            <th>Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each accounts as account (account.id)}
          <tr class="glass-row-hover">
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
            <td class="hidden sm:table-cell text-text-muted">{new Date(account.createdAt).toLocaleDateString()}</td>
            {#if data.userRole === "admin"}
              <td>
                <form method="POST" action="?/delete" onsubmit={handleDelete}>
                  <input type="hidden" name="id" value={account.id} />
                  <button type="submit" class="text-red-400 hover:text-red-300 text-sm">Delete</button>
                </form>
              </td>
            {/if}
          </tr>
        {:else}
          <tr>
            <td colspan={data.userRole === "admin" ? 5 : 4} class="px-6 py-8 text-center text-sm text-text-muted">No accounts found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
