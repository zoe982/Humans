<script lang="ts">
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import { Copy, Check } from "lucide-svelte";
  import { toast } from "svelte-sonner";
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

  const entry = $derived(data.entry as ErrorEntry);

  let copied = $state(false);

  async function copyError() {
    await navigator.clipboard.writeText(formatErrorForClipboard(entry));
    copied = true;
    toast.success("Copied to clipboard");
    setTimeout(() => { copied = false; }, 2000);
  }

  function formatDetails(details: unknown): string {
    if (details == null) return "—";
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  }

  const resolutionColorMap: Record<string, string> = {
    open: "badge-yellow",
    resolved: "badge-green",
  };

  const resolutionLabels: Record<string, string> = {
    open: "Open",
    resolved: "Resolved",
  };
</script>

<svelte:head>
  <title>Error {entry.displayId} - Admin - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/admin/error-log"
    backLabel="Error Log"
    title={entry.displayId}
    status={entry.resolutionStatus}
    statusOptions={["open", "resolved"]}
    statusColorMap={resolutionColorMap}
    statusLabels={resolutionLabels}
    statusFormAction="?/toggleResolution"
  >
    {#snippet actions()}
      <button
        type="button"
        onclick={copyError}
        class="btn-ghost text-sm py-1.5 px-3 inline-flex items-center gap-2"
      >
        {#if copied}
          <Check size={14} class="text-[var(--badge-green-text)]" /> Copied
        {:else}
          <Copy size={14} /> Copy for Claude
        {/if}
      </button>
    {/snippet}
  </RecordManagementBar>

  <div class="glass-card p-6 space-y-6">
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <dt class="text-xs text-text-muted uppercase tracking-wider">Display ID</dt>
        <dd class="mt-1 font-mono text-sm text-text-primary">{entry.displayId}</dd>
      </div>
      <div>
        <dt class="text-xs text-text-muted uppercase tracking-wider">Status</dt>
        <dd class="mt-1">
          <span class="glass-badge {entry.status >= 500 ? 'badge-red' : 'badge-yellow'}">
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
          <pre class="glass-card p-4 text-sm font-mono text-destructive-foreground overflow-x-auto whitespace-pre-wrap">{entry.stack}</pre>
        </dd>
      </div>
    {/if}
  </div>
</div>
