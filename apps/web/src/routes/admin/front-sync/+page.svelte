<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import { api } from "$lib/api";
  import { Loader2 } from "lucide-svelte";

  interface SyncResult {
    total: number;
    imported: number;
    skipped: number;
    unmatched: number;
    errors: string[];
    nextCursor: string | null;
  }

  let { form } = $props();

  let syncing = $state(false);
  let batchCount = $state(0);
  let totals = $state({ imported: 0, skipped: 0, unmatched: 0, errors: 0 });
  let errorMessages = $state<string[]>([]);
  let finished = $state(false);
  let errorMsg = $state("");

  function addBatch(result: SyncResult) {
    batchCount++;
    totals.imported += result.imported;
    totals.skipped += result.skipped;
    totals.unmatched += result.unmatched;
    totals.errors += result.errors.length;
    if (result.errors.length > 0) {
      errorMessages = [...errorMessages, ...result.errors];
    }
  }

  async function continueSyncing(cursor: string) {
    try {
      const res = (await api(`/api/admin/front/sync?limit=20&cursor=${encodeURIComponent(cursor)}`, {
        method: "POST",
      })) as { data: SyncResult };

      addBatch(res.data);

      if (res.data.nextCursor) {
        await continueSyncing(res.data.nextCursor);
      } else {
        finished = true;
        syncing = false;
      }
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : "Sync failed";
      syncing = false;
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
      }
    }

    if (form?.error && !errorMsg) {
      errorMsg = form.error as string;
    }
  });
</script>

<svelte:head>
  <title>Front Sync - Admin - Humans CRM</title>
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
