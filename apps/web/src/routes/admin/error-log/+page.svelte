<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";

  let { data }: { data: PageData } = $props();

  type ErrorEntry = {
    id: string;
    requestId: string;
    code: string;
    message: string;
    status: number;
    method: string | null;
    path: string | null;
    userId: string | null;
    createdAt: string;
  };

  const errors = $derived(data.errors as ErrorEntry[]);

  let codeFilter = $state(data.codeFilter);
  let dateFrom = $state(data.dateFrom);
  let dateTo = $state(data.dateTo);
</script>

<svelte:head>
  <title>Error Log - Admin - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Error Log"
    breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Error Log" }]}
  />

  <!-- Filters -->
  <form method="GET" class="mb-6 flex flex-wrap items-end gap-3">
    <div>
      <label for="code" class="block text-xs text-text-secondary mb-1">Error Code</label>
      <input
        id="code"
        name="code"
        type="text"
        bind:value={codeFilter}
        placeholder="e.g. HUMAN_NOT_FOUND"
        class="glass-input w-56 text-sm"
      />
    </div>
    <div>
      <label for="dateFrom" class="block text-xs text-text-secondary mb-1">From</label>
      <input id="dateFrom" name="dateFrom" type="date" bind:value={dateFrom} class="glass-input text-sm" />
    </div>
    <div>
      <label for="dateTo" class="block text-xs text-text-secondary mb-1">To</label>
      <input id="dateTo" name="dateTo" type="date" bind:value={dateTo} class="glass-input text-sm" />
    </div>
    <button type="submit" class="btn-primary text-sm">Filter</button>
  </form>

  <!-- Cleanup -->
  <form method="POST" action="?/cleanup" class="mb-4">
    <button type="submit" class="btn-ghost text-sm text-red-400 hover:text-red-300">
      Purge entries older than 7 days
    </button>
  </form>

  <div class="glass-card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="glass-thead">
          <tr>
            <th>Time</th>
            <th>Status</th>
            <th>Code</th>
            <th>Message</th>
            <th>Path</th>
            <th>User</th>
            <th>Request ID</th>
          </tr>
        </thead>
        <tbody>
          {#each errors as entry (entry.id)}
            <tr class="glass-row-hover">
              <td class="text-text-muted font-mono text-xs whitespace-nowrap">
                {new Date(entry.createdAt).toLocaleString()}
              </td>
              <td>
                <span class="glass-badge {entry.status >= 500 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}">
                  {entry.status}
                </span>
              </td>
              <td class="font-mono text-xs text-text-secondary">{entry.code}</td>
              <td class="max-w-xs truncate text-text-primary" title={entry.message}>{entry.message}</td>
              <td class="font-mono text-xs text-text-muted">
                {#if entry.method}<span class="text-accent">{entry.method}</span>{/if}
                {entry.path ?? "—"}
              </td>
              <td class="font-mono text-xs text-text-muted">{entry.userId ? entry.userId.slice(0, 8) + "…" : "—"}</td>
              <td class="font-mono text-xs text-text-muted">{entry.requestId.slice(0, 8)}…</td>
            </tr>
          {:else}
            <tr>
              <td colspan="7" class="px-4 py-8 text-center text-text-muted">No errors logged.</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="mt-4 flex justify-between">
    {#if data.offset > 0}
      <a href="?offset={data.offset - data.limit}{codeFilter ? `&code=${codeFilter}` : ''}{dateFrom ? `&dateFrom=${dateFrom}` : ''}{dateTo ? `&dateTo=${dateTo}` : ''}" class="text-sm text-accent hover:text-cyan-300">&larr; Previous</a>
    {:else}
      <span></span>
    {/if}
    {#if errors.length === data.limit}
      <a href="?offset={data.offset + data.limit}{codeFilter ? `&code=${codeFilter}` : ''}{dateFrom ? `&dateFrom=${dateFrom}` : ''}{dateTo ? `&dateTo=${dateTo}` : ''}" class="text-sm text-accent hover:text-cyan-300">Next &rarr;</a>
    {/if}
  </div>
</div>
