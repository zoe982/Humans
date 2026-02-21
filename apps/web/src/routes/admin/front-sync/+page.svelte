<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { api } from "$lib/api";
  import { invalidateAll } from "$app/navigation";
  import { Loader2 } from "lucide-svelte";

  interface SyncResult {
    total: number;
    imported: number;
    skipped: number;
    unmatched: number;
    errors: string[];
    nextCursor: string | null;
    syncRunId: string;
  }

  interface SyncRun {
    id: string;
    displayId: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    totalMessages: number;
    imported: number;
    skipped: number;
    unmatched: number;
    errorCount: number;
    linkedToHumans: number;
    linkedToAccounts: number;
    linkedToRouteSignups: number;
    linkedToBookings: number;
    linkedToColleagues: number;
  }

  let { data, form } = $props();
  const syncRuns = $derived((data.syncRuns ?? []) as SyncRun[]);

  let syncing = $state(false);
  let batchCount = $state(0);
  let currentSyncRunId = $state<string | null>(null);
  let totals = $state({ imported: 0, skipped: 0, unmatched: 0, errors: 0 });
  let linkStats = $state({ humans: 0, accounts: 0, routeSignups: 0, bookings: 0, colleagues: 0 });
  let errorMessages = $state<string[]>([]);
  let finished = $state(false);
  let errorMsg = $state("");

  // Revert state
  let showRevertConfirm = $state(false);
  let revertTargetId = $state("");
  let reverting = $state(false);

  function addBatch(result: SyncResult) {
    batchCount++;
    totals.imported += result.imported;
    totals.skipped += result.skipped;
    totals.unmatched += result.unmatched;
    totals.errors += result.errors.length;
    linkStats.humans += result.linkedToHumans ?? 0;
    linkStats.accounts += result.linkedToAccounts ?? 0;
    linkStats.routeSignups += result.linkedToRouteSignups ?? 0;
    linkStats.bookings += result.linkedToBookings ?? 0;
    linkStats.colleagues += result.linkedToColleagues ?? 0;
    if (!currentSyncRunId && result.syncRunId) {
      currentSyncRunId = result.syncRunId;
    }
    if (result.errors.length > 0) {
      errorMessages = [...errorMessages, ...result.errors];
    }
  }

  async function continueSyncing(cursor: string) {
    try {
      const params = new URLSearchParams({ limit: "20", cursor });
      if (currentSyncRunId) params.set("syncRunId", currentSyncRunId);
      const res = (await api(`/api/admin/front/sync?${params.toString()}`, {
        method: "POST",
      })) as { data: SyncResult };

      addBatch(res.data);

      if (res.data.nextCursor) {
        await continueSyncing(res.data.nextCursor);
      } else {
        finished = true;
        syncing = false;
        await invalidateAll();
      }
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : "Sync failed";
      syncing = false;
      await invalidateAll();
    }
  }

  $effect(() => {
    if (form?.result && syncing === false && finished === false && batchCount === 0) {
      const result = form.result as SyncResult;
      syncing = true;
      addBatch(result);

      if (result.nextCursor) {
        continueSyncing(result.nextCursor);
      } else {
        finished = true;
        syncing = false;
        invalidateAll();
      }
    }

    if (form?.error && !errorMsg) {
      errorMsg = form.error as string;
    }

    if (form?.revertResult) {
      invalidateAll();
    }

    if (form?.revertError && !errorMsg) {
      errorMsg = form.revertError as string;
    }
  });

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
  }

  const statusColors: Record<string, string> = {
    running: "bg-blue-500/20 text-blue-400",
    completed: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
    reverted: "bg-yellow-500/20 text-yellow-400",
  };
</script>

<svelte:head>
  <title>Front Sync - Admin - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Front Sync"
    breadcrumbs={[
      { label: "Dashboard", href: "/dashboard" },
      { label: "Admin", href: "/admin" },
      { label: "Front Sync" },
    ]}
  />

  {#if errorMsg}
    <AlertBanner type="error" message={errorMsg} />
  {/if}

  {#if finished}
    <AlertBanner type="success" message="Sync complete! Imported {totals.imported} activities across {batchCount} batches." />
  {/if}

  {#if form?.revertResult}
    <AlertBanner type="success" message="Revert complete! Deleted {form.revertResult.deleted} activities, skipped {form.revertResult.skipped} modified." />
  {/if}

  <!-- Sync History -->
  {#if syncRuns.length > 0}
    <div class="glass-card overflow-hidden mb-6">
      <div class="p-4 border-b border-glass-border">
        <h2 class="text-lg font-semibold text-text-primary">Sync History</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="glass-thead">
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Started</th>
              <th>Imported</th>
              <th>Skipped</th>
              <th>Unmatched</th>
              <th>Errors</th>
              <th>Linked</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each syncRuns as run (run.id)}
              <tr class="glass-row-hover">
                <td class="font-mono text-xs text-accent">{run.displayId}</td>
                <td>
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {statusColors[run.status] ?? 'bg-glass text-text-secondary'}">
                    {run.status}
                  </span>
                </td>
                <td class="text-text-muted text-xs whitespace-nowrap">{formatDate(run.startedAt)}</td>
                <td class="text-green-400 font-medium">{run.imported}</td>
                <td class="text-text-secondary">{run.skipped}</td>
                <td class="text-yellow-400">{run.unmatched}</td>
                <td class="text-red-400">{run.errorCount}</td>
                <td class="text-xs text-text-muted whitespace-nowrap">
                  {#if run.linkedToHumans > 0}<span class="mr-1">H:{run.linkedToHumans}</span>{/if}
                  {#if run.linkedToAccounts > 0}<span class="mr-1">A:{run.linkedToAccounts}</span>{/if}
                  {#if run.linkedToRouteSignups > 0}<span class="mr-1">RS:{run.linkedToRouteSignups}</span>{/if}
                  {#if run.linkedToBookings > 0}<span class="mr-1">B:{run.linkedToBookings}</span>{/if}
                  {#if run.linkedToColleagues > 0}<span>C:{run.linkedToColleagues}</span>{/if}
                  {#if run.linkedToHumans === 0 && run.linkedToAccounts === 0 && run.linkedToRouteSignups === 0 && run.linkedToBookings === 0 && run.linkedToColleagues === 0}
                    —
                  {/if}
                </td>
                <td>
                  {#if run.status === "completed"}
                    <button
                      type="button"
                      class="text-xs text-red-400 hover:text-red-300 transition-colors"
                      onclick={() => { revertTargetId = run.id; showRevertConfirm = true; }}
                    >
                      Revert
                    </button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Sync Controls -->
  <div class="glass-card p-6">
    <p class="text-sm text-text-secondary mb-4">
      Import conversations from Front.com as activities. Each batch processes up to 20 conversations.
      The sync will automatically continue until all conversations have been processed.
    </p>

    <form method="POST" action="?/sync">
      <button
        type="submit"
        disabled={syncing}
        class="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {#if syncing}
          <Loader2 size={16} class="animate-spin" />
          Syncing...
        {:else}
          Start Sync
        {/if}
      </button>
    </form>

    {#if batchCount > 0}
      <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="rounded-lg border border-glass-border bg-glass-bg p-4">
          <p class="text-xs font-medium uppercase text-text-muted">Imported</p>
          <p class="mt-1 text-2xl font-bold text-green-400">{totals.imported}</p>
        </div>
        <div class="rounded-lg border border-glass-border bg-glass-bg p-4">
          <p class="text-xs font-medium uppercase text-text-muted">Skipped</p>
          <p class="mt-1 text-2xl font-bold text-text-secondary">{totals.skipped}</p>
        </div>
        <div class="rounded-lg border border-glass-border bg-glass-bg p-4">
          <p class="text-xs font-medium uppercase text-text-muted">Unmatched</p>
          <p class="mt-1 text-2xl font-bold text-yellow-400">{totals.unmatched}</p>
        </div>
        <div class="rounded-lg border border-glass-border bg-glass-bg p-4">
          <p class="text-xs font-medium uppercase text-text-muted">Errors</p>
          <p class="mt-1 text-2xl font-bold text-red-400">{totals.errors}</p>
        </div>
      </div>

      {#if linkStats.humans > 0 || linkStats.accounts > 0 || linkStats.routeSignups > 0 || linkStats.bookings > 0 || linkStats.colleagues > 0}
        <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div class="rounded-lg border border-glass-border bg-glass-bg p-3">
            <p class="text-xs font-medium uppercase text-text-muted">Humans</p>
            <p class="mt-1 text-lg font-bold text-text-primary">{linkStats.humans}</p>
          </div>
          <div class="rounded-lg border border-glass-border bg-glass-bg p-3">
            <p class="text-xs font-medium uppercase text-text-muted">Accounts</p>
            <p class="mt-1 text-lg font-bold text-text-primary">{linkStats.accounts}</p>
          </div>
          <div class="rounded-lg border border-glass-border bg-glass-bg p-3">
            <p class="text-xs font-medium uppercase text-text-muted">Route Signups</p>
            <p class="mt-1 text-lg font-bold text-text-primary">{linkStats.routeSignups}</p>
          </div>
          <div class="rounded-lg border border-glass-border bg-glass-bg p-3">
            <p class="text-xs font-medium uppercase text-text-muted">Bookings</p>
            <p class="mt-1 text-lg font-bold text-text-primary">{linkStats.bookings}</p>
          </div>
          <div class="rounded-lg border border-glass-border bg-glass-bg p-3">
            <p class="text-xs font-medium uppercase text-text-muted">Colleagues</p>
            <p class="mt-1 text-lg font-bold text-text-primary">{linkStats.colleagues}</p>
          </div>
        </div>
      {/if}

      <p class="mt-3 text-xs text-text-muted">
        {#if syncing}
          Processing batch {batchCount + 1}...
        {:else}
          Completed {batchCount} {batchCount === 1 ? "batch" : "batches"}.
        {/if}
      </p>

      {#if errorMessages.length > 0}
        <div class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p class="text-sm font-medium text-red-400 mb-2">Errors ({errorMessages.length}):</p>
          <ul class="space-y-1 text-xs text-red-300 max-h-40 overflow-y-auto">
            {#each errorMessages as err}
              <li class="font-mono">{err}</li>
            {/each}
          </ul>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Revert confirmation -->
<form method="POST" action="?/revert" id="revertForm">
  <input type="hidden" name="syncRunId" value={revertTargetId} />
</form>

<ConfirmDialog
  open={showRevertConfirm}
  message="Are you sure you want to revert this sync run? Activities that have been modified since import will be preserved."
  onConfirm={() => {
    const form = document.getElementById("revertForm") as HTMLFormElement;
    form?.requestSubmit();
    showRevertConfirm = false;
  }}
  onCancel={() => { showRevertConfirm = false; }}
/>
