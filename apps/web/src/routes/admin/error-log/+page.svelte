<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import { ChevronLeft, ChevronRight, Copy, Check } from "lucide-svelte";
  import { formatErrorForClipboard } from "$lib/utils/error-format";

  let { data }: { data: PageData } = $props();

  type ErrorEntry = {
    id: string;
    displayId: string;
    requestId: string;
    code: string;
    message: string;
    status: number;
    resolutionStatus: string;
    method: string | null;
    path: string | null;
    userId: string | null;
    details: unknown;
    stack: string | null;
    createdAt: string;
  };

  const errors = $derived(data.errors as ErrorEntry[]);

  let codeFilter = $state(data.codeFilter);
  let dateFrom = $state(data.dateFrom);
  let dateTo = $state(data.dateTo);
  let resolutionStatus = $state(data.resolutionStatus);

  let copiedId = $state<string | null>(null);

  async function copyError(entry: ErrorEntry) {
    await navigator.clipboard.writeText(formatErrorForClipboard(entry));
    copiedId = entry.id;
    setTimeout(() => { copiedId = null; }, 2000);
  }

  function paginationParams(): string {
    let p = "";
    if (codeFilter) p += `&code=${codeFilter}`;
    if (dateFrom) p += `&dateFrom=${dateFrom}`;
    if (dateTo) p += `&dateTo=${dateTo}`;
    if (resolutionStatus) p += `&resolutionStatus=${resolutionStatus}`;
    return p;
  }
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
    <div>
      <label for="resolutionStatus" class="block text-xs text-text-secondary mb-1">Resolution</label>
      <select id="resolutionStatus" name="resolutionStatus" bind:value={resolutionStatus} class="glass-input text-sm">
        <option value="">All</option>
        <option value="open">Open</option>
        <option value="resolved">Resolved</option>
      </select>
    </div>
    <button type="submit" class="btn-primary text-sm">Filter</button>
  </form>

  <div class="glass-card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="glass-thead">
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Time</th>
            <th scope="col">HTTP</th>
            <th scope="col">Resolution</th>
            <th scope="col">Code</th>
            <th scope="col">Message</th>
            <th scope="col">Path</th>
            <th scope="col">Copy</th>
          </tr>
        </thead>
        <tbody>
          {#each errors as entry (entry.id)}
            <tr class="glass-row-hover">
              <td class="font-mono text-xs">
                <a href="/admin/error-log/{entry.id}" class="text-accent hover:text-cyan-300">{entry.displayId}</a>
              </td>
              <td class="text-text-muted font-mono text-xs whitespace-nowrap">
                {new Date(entry.createdAt).toLocaleString()}
              </td>
              <td>
                <span class="glass-badge {entry.status >= 500 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}">
                  {entry.status}
                </span>
              </td>
              <td>
                <form method="POST" action="?/toggleResolution" class="inline">
                  <input type="hidden" name="id" value={entry.id} />
                  <input type="hidden" name="resolutionStatus" value={entry.resolutionStatus === "open" ? "resolved" : "open"} />
                  <button type="submit" class="glass-badge cursor-pointer {entry.resolutionStatus === 'open' ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/20 text-green-300'}">
                    {entry.resolutionStatus === "open" ? "Open" : "Resolved"}
                  </button>
                </form>
              </td>
              <td class="font-mono text-xs text-text-primary">{entry.code}</td>
              <td class="max-w-xs truncate text-text-primary" title={entry.message}>{entry.message}</td>
              <td class="font-mono text-xs text-text-muted">
                {#if entry.method}<span class="text-accent">{entry.method}</span>{/if}
                {entry.path ?? "—"}
              </td>
              <td>
                <button
                  type="button"
                  onclick={() => copyError(entry)}
                  class="p-1 text-text-muted hover:text-text-primary"
                  title="Copy error details"
                >
                  {#if copiedId === entry.id}
                    <Check size={14} class="text-green-400" />
                  {:else}
                    <Copy size={14} />
                  {/if}
                </button>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="8" class="px-4 py-8 text-center text-text-muted">No errors logged.</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="mt-4 flex justify-between">
    {#if data.offset > 0}
      <a href="?offset={data.offset - data.limit}{paginationParams()}" class="btn-ghost text-sm py-1.5 px-3 inline-flex items-center gap-1">
        <ChevronLeft size={14} /> Previous
      </a>
    {:else}
      <span></span>
    {/if}
    {#if errors.length === data.limit}
      <a href="?offset={data.offset + data.limit}{paginationParams()}" class="btn-ghost text-sm py-1.5 px-3 inline-flex items-center gap-1">
        Next <ChevronRight size={14} />
      </a>
    {/if}
  </div>
</div>
