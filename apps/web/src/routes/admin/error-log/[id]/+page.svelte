<script lang="ts">
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";

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
    details: unknown;
    stack: string | null;
    createdAt: string;
  };

  const entry = $derived(data.entry as ErrorEntry);

  function formatDetails(details: unknown): string {
    if (details == null) return "—";
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  }
</script>

<svelte:head>
  <title>Error {entry.code} - Admin - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/admin/error-log"
    backLabel="Error Log"
    title="Error Detail"
  />

  <div class="glass-card p-6 space-y-6">
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <dt class="text-xs text-text-muted uppercase tracking-wider">Status</dt>
        <dd class="mt-1">
          <span class="glass-badge {entry.status >= 500 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}">
            {entry.status}
          </span>
        </dd>
      </div>
      <div>
        <dt class="text-xs text-text-muted uppercase tracking-wider">Code</dt>
        <dd class="mt-1 font-mono text-sm text-text-primary">{entry.code}</dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs text-text-muted uppercase tracking-wider">Message</dt>
        <dd class="mt-1 text-text-primary">{entry.message}</dd>
      </div>
      <div>
        <dt class="text-xs text-text-muted uppercase tracking-wider">Method</dt>
        <dd class="mt-1 font-mono text-sm text-accent">{entry.method ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-xs text-text-muted uppercase tracking-wider">Path</dt>
        <dd class="mt-1 font-mono text-sm text-text-primary">{entry.path ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-xs text-text-muted uppercase tracking-wider">Request ID</dt>
        <dd class="mt-1 font-mono text-sm text-text-secondary">{entry.requestId}</dd>
      </div>
      <div>
        <dt class="text-xs text-text-muted uppercase tracking-wider">User ID</dt>
        <dd class="mt-1 font-mono text-sm text-text-secondary">{entry.userId ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-xs text-text-muted uppercase tracking-wider">Created At</dt>
        <dd class="mt-1 text-text-secondary">{new Date(entry.createdAt).toLocaleString()}</dd>
      </div>
    </div>

    {#if entry.details != null}
      <div>
        <dt class="text-xs text-text-muted uppercase tracking-wider mb-2">Details</dt>
        <dd>
          <pre class="glass-card p-4 text-sm font-mono text-text-secondary overflow-x-auto">{formatDetails(entry.details)}</pre>
        </dd>
      </div>
    {/if}

    {#if entry.stack}
      <div>
        <dt class="text-xs text-text-muted uppercase tracking-wider mb-2">Stack Trace</dt>
        <dd>
          <pre class="glass-card p-4 text-sm font-mono text-red-300 overflow-x-auto whitespace-pre-wrap">{entry.stack}</pre>
        </dd>
      </div>
    {/if}
  </div>
</div>
