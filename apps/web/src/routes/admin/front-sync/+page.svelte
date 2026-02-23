<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import * as Sheet from "$lib/components/ui/sheet";
  import { api } from "$lib/api";
  import { invalidateAll } from "$app/navigation";
  import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-svelte";

  interface UnmatchedContact {
    handle: string;
    name: string | null;
    conversationId: string;
    conversationSubject: string;
    type: string;
    messageCount: number;
  }

  interface SyncResult {
    total: number;
    imported: number;
    skipped: number;
    unmatched: number;
    errors: string[];
    unmatchedContacts: UnmatchedContact[];
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
    linkedToGeneralLeads: number;
    unmatchedContacts: string | null;
    initiatedByColleagueId: string | null;
    initiatedByName: string | null;
  }

  let { data, form } = $props();
  const syncRuns = $derived((data.syncRuns ?? []) as SyncRun[]);

  let syncing = $state(false);
  let batchCount = $state(0);
  let currentSyncRunId = $state<string | null>(null);
  let totals = $state({ imported: 0, skipped: 0, unmatched: 0, errors: 0 });
  let linkStats = $state({ humans: 0, accounts: 0, routeSignups: 0, bookings: 0, colleagues: 0, generalLeads: 0 });
  let errorMessages = $state<string[]>([]);
  let unmatchedContacts = $state<UnmatchedContact[]>([]);
  let finished = $state(false);
  let errorMsg = $state("");

  // Revert state
  let showRevertConfirm = $state(false);
  let revertTargetId = $state("");
  let reverting = $state(false);

  // Expanded unmatched contacts row in history table
  let expandedRunId = $state<string | null>(null);

  // Debug sheet state
  interface MatchAttempt {
    source: string;
    searchedFor: string;
    found: boolean;
    detail?: string;
  }

  interface DebugResult {
    conversation: Record<string, unknown>;
    messages: Record<string, unknown>[];
    matchAttempts: MatchAttempt[];
  }

  let sheetOpen = $state(false);
  let sheetContact = $state<UnmatchedContact | null>(null);
  let sheetLoading = $state(false);
  let sheetError = $state("");
  let sheetDebug = $state<DebugResult | null>(null);
  let showRawConversation = $state(false);
  let showRawMessages = $state(false);

  // Derive unmatched contacts from the latest completed sync run
  const latestCompletedRun = $derived(syncRuns.find((r) => r.status === "completed"));
  const lastRunUnmatched = $derived(
    latestCompletedRun ? parseUnmatchedContacts(latestCompletedRun.unmatchedContacts) : [],
  );

  async function openDebugSheet(contact: UnmatchedContact) {
    sheetContact = contact;
    sheetDebug = null;
    sheetError = "";
    sheetLoading = true;
    showRawConversation = false;
    showRawMessages = false;
    sheetOpen = true;

    try {
      const params = new URLSearchParams({ handle: contact.handle });
      const res = (await api(
        `/api/admin/front/conversations/${contact.conversationId}/debug?${params.toString()}`,
      )) as { data: DebugResult };
      sheetDebug = res.data;
    } catch (err) {
      sheetError = err instanceof Error ? err.message : "Failed to load debug info";
    } finally {
      sheetLoading = false;
    }
  }

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
    linkStats.generalLeads += result.linkedToGeneralLeads ?? 0;
    if (!currentSyncRunId && result.syncRunId) {
      currentSyncRunId = result.syncRunId;
    }
    if (result.errors.length > 0) {
      errorMessages = [...errorMessages, ...result.errors];
    }
    if (result.unmatchedContacts?.length > 0) {
      unmatchedContacts = [...unmatchedContacts, ...result.unmatchedContacts];
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

  function parseUnmatchedContacts(json: string | null): UnmatchedContact[] {
    if (!json) return [];
    try {
      return JSON.parse(json) as UnmatchedContact[];
    } catch {
      return [];
    }
  }

  const statusColors: Record<string, string> = {
    running: "badge-blue",
    completed: "badge-green",
    failed: "badge-red",
    reverted: "badge-yellow",
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

  <!-- Standing Unmatched Contacts from Last Sync -->
  {#if latestCompletedRun}
    <div class="glass-card overflow-hidden mb-6">
      <div class="p-4 border-b border-glass-border flex items-center justify-between">
        <h2 class="text-lg font-semibold text-text-primary">
          Unmatched Contacts
          <span class="text-sm font-normal text-text-muted ml-2">
            from last sync (Run {latestCompletedRun.displayId})
          </span>
        </h2>
        {#if lastRunUnmatched.length > 0}
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium badge-yellow">
            {lastRunUnmatched.length}
          </span>
        {/if}
      </div>
      {#if lastRunUnmatched.length === 0}
        <div class="p-4">
          <p class="text-sm text-text-muted">No unmatched contacts from the last sync.</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="glass-thead">
              <tr>
                <th>Handle</th>
                <th>Name</th>
                <th>Type</th>
                <th>Subject</th>
                <th class="text-right">Messages</th>
              </tr>
            </thead>
            <tbody>
              {#each lastRunUnmatched as contact}
                <tr
                  class="glass-row-hover cursor-pointer"
                  onclick={() => openDebugSheet(contact)}
                >
                  <td class="font-mono text-xs">{contact.handle}</td>
                  <td class="text-text-secondary text-xs">{contact.name ?? "—"}</td>
                  <td class="text-text-muted text-xs">{contact.type}</td>
                  <td class="text-text-secondary text-xs max-w-xs truncate">{contact.conversationSubject}</td>
                  <td class="text-right text-xs">{contact.messageCount}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div class="p-3 border-t border-glass-border">
          <p class="text-xs text-text-muted">Click a row to view matching debug info and raw Front data.</p>
        </div>
      {/if}
    </div>
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
              <th>Initiated By</th>
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
              {@const runUnmatched = parseUnmatchedContacts(run.unmatchedContacts)}
              <tr class="glass-row-hover">
                <td class="font-mono text-xs text-accent">{run.displayId}</td>
                <td>
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {statusColors[run.status] ?? 'bg-glass text-text-secondary'}">
                    {run.status}
                  </span>
                </td>
                <td class="text-text-muted text-xs whitespace-nowrap">
                  {run.initiatedByColleagueId ? (run.initiatedByName ?? "Unknown") : "System"}
                </td>
                <td class="text-text-muted text-xs whitespace-nowrap">{formatDate(run.startedAt)}</td>
                <td class="text-[var(--badge-green-text)] font-medium">{run.imported}</td>
                <td class="text-text-secondary">{run.skipped}</td>
                <td>
                  {#if runUnmatched.length > 0}
                    <button
                      type="button"
                      class="text-[var(--badge-yellow-text)] font-medium hover:underline cursor-pointer"
                      onclick={() => { expandedRunId = expandedRunId === run.id ? null : run.id; }}
                    >
                      {run.unmatched}
                    </button>
                  {:else}
                    <span class="text-[var(--badge-yellow-text)]">{run.unmatched}</span>
                  {/if}
                </td>
                <td class="text-destructive-foreground">{run.errorCount}</td>
                <td class="text-xs text-text-muted whitespace-nowrap">
                  {#if run.linkedToHumans > 0}<span class="mr-1">H:{run.linkedToHumans}</span>{/if}
                  {#if run.linkedToAccounts > 0}<span class="mr-1">A:{run.linkedToAccounts}</span>{/if}
                  {#if run.linkedToRouteSignups > 0}<span class="mr-1">RS:{run.linkedToRouteSignups}</span>{/if}
                  {#if run.linkedToBookings > 0}<span class="mr-1">B:{run.linkedToBookings}</span>{/if}
                  {#if run.linkedToGeneralLeads > 0}<span class="mr-1">GL:{run.linkedToGeneralLeads}</span>{/if}
                  {#if run.linkedToColleagues > 0}<span>C:{run.linkedToColleagues}</span>{/if}
                  {#if run.linkedToHumans === 0 && run.linkedToAccounts === 0 && run.linkedToRouteSignups === 0 && run.linkedToBookings === 0 && run.linkedToGeneralLeads === 0 && run.linkedToColleagues === 0}
                    —
                  {/if}
                </td>
                <td>
                  {#if run.status === "completed"}
                    <button
                      type="button"
                      class="text-xs text-destructive-foreground hover:opacity-80 transition-colors"
                      onclick={() => { revertTargetId = run.id; showRevertConfirm = true; }}
                    >
                      Revert
                    </button>
                  {/if}
                </td>
              </tr>
              {#if expandedRunId === run.id && runUnmatched.length > 0}
                <tr>
                  <td colspan="10" class="p-0">
                    <div class="border-t border-b border-yellow-500/30 bg-yellow-500/5 p-4">
                      <p class="text-sm font-medium text-[var(--badge-yellow-text)] mb-2">
                        Unmatched Contacts ({runUnmatched.length})
                      </p>
                      <table class="min-w-full text-xs">
                        <thead>
                          <tr class="text-text-muted">
                            <th class="text-left py-1 pr-3">Handle</th>
                            <th class="text-left py-1 pr-3">Name</th>
                            <th class="text-left py-1 pr-3">Type</th>
                            <th class="text-left py-1 pr-3">Subject</th>
                            <th class="text-right py-1">Messages</th>
                          </tr>
                        </thead>
                        <tbody>
                          {#each runUnmatched as contact}
                            <tr
                              class="border-t border-yellow-500/10 hover:bg-yellow-500/10 cursor-pointer transition-colors"
                              onclick={() => openDebugSheet(contact)}
                            >
                              <td class="py-1 pr-3 font-mono">{contact.handle}</td>
                              <td class="py-1 pr-3 text-text-secondary">{contact.name ?? "—"}</td>
                              <td class="py-1 pr-3 text-text-muted">{contact.type}</td>
                              <td class="py-1 pr-3 text-text-secondary max-w-xs truncate">{contact.conversationSubject}</td>
                              <td class="py-1 text-right">{contact.messageCount}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              {/if}
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
      Unmatched conversations are skipped and surfaced below.
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
          <p class="mt-1 text-2xl font-bold text-[var(--badge-green-text)]">{totals.imported}</p>
        </div>
        <div class="rounded-lg border border-glass-border bg-glass-bg p-4">
          <p class="text-xs font-medium uppercase text-text-muted">Skipped</p>
          <p class="mt-1 text-2xl font-bold text-text-secondary">{totals.skipped}</p>
        </div>
        <div class="rounded-lg border border-glass-border bg-glass-bg p-4">
          <p class="text-xs font-medium uppercase text-text-muted">Unmatched</p>
          <p class="mt-1 text-2xl font-bold text-[var(--badge-yellow-text)]">{totals.unmatched}</p>
        </div>
        <div class="rounded-lg border border-glass-border bg-glass-bg p-4">
          <p class="text-xs font-medium uppercase text-text-muted">Errors</p>
          <p class="mt-1 text-2xl font-bold text-destructive-foreground">{totals.errors}</p>
        </div>
      </div>

      {#if linkStats.humans > 0 || linkStats.accounts > 0 || linkStats.routeSignups > 0 || linkStats.bookings > 0 || linkStats.generalLeads > 0 || linkStats.colleagues > 0}
        <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
            <p class="text-xs font-medium uppercase text-text-muted">General Leads</p>
            <p class="mt-1 text-lg font-bold text-text-primary">{linkStats.generalLeads}</p>
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

      {#if unmatchedContacts.length > 0}
        <div class="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p class="text-sm font-medium text-[var(--badge-yellow-text)] mb-2">
            Unmatched Contacts ({unmatchedContacts.length})
          </p>
          <p class="text-xs text-text-muted mb-3">
            These contacts couldn't be matched to any record in the CRM. Create the missing records, then re-sync.
          </p>
          <div class="overflow-x-auto max-h-60 overflow-y-auto">
            <table class="min-w-full text-xs">
              <thead>
                <tr class="text-text-muted">
                  <th class="text-left py-1 pr-3">Handle</th>
                  <th class="text-left py-1 pr-3">Name</th>
                  <th class="text-left py-1 pr-3">Type</th>
                  <th class="text-left py-1 pr-3">Subject</th>
                  <th class="text-right py-1">Messages</th>
                </tr>
              </thead>
              <tbody>
                {#each unmatchedContacts as contact}
                  <tr class="border-t border-yellow-500/10">
                    <td class="py-1 pr-3 font-mono">{contact.handle}</td>
                    <td class="py-1 pr-3 text-text-secondary">{contact.name ?? "—"}</td>
                    <td class="py-1 pr-3 text-text-muted">{contact.type}</td>
                    <td class="py-1 pr-3 text-text-secondary max-w-xs truncate">{contact.conversationSubject}</td>
                    <td class="py-1 text-right">{contact.messageCount}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}

      {#if errorMessages.length > 0}
        <div class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p class="text-sm font-medium text-destructive-foreground mb-2">Errors ({errorMessages.length}):</p>
          <ul class="space-y-1 text-xs text-destructive-foreground max-h-40 overflow-y-auto">
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

<!-- Debug Sheet -->
<Sheet.Root bind:open={sheetOpen}>
  <Sheet.Content side="right" class="sm:max-w-2xl overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title>Unmatched Contact Debug</Sheet.Title>
      <Sheet.Description>
        {#if sheetContact}
          Investigating why <span class="font-mono">{sheetContact.handle}</span> couldn't be matched
        {/if}
      </Sheet.Description>
    </Sheet.Header>

    {#if sheetContact}
      <!-- Contact Info -->
      <div class="mt-4 space-y-3">
        <h3 class="text-sm font-semibold text-text-primary">Contact Info</h3>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-text-muted">Handle:</span>
            <span class="font-mono ml-1">{sheetContact.handle}</span>
          </div>
          <div>
            <span class="text-text-muted">Name:</span>
            <span class="ml-1">{sheetContact.name ?? "—"}</span>
          </div>
          <div>
            <span class="text-text-muted">Type:</span>
            <span class="ml-1">{sheetContact.type}</span>
          </div>
          <div>
            <span class="text-text-muted">Messages:</span>
            <span class="ml-1">{sheetContact.messageCount}</span>
          </div>
          <div class="col-span-2">
            <span class="text-text-muted">Subject:</span>
            <span class="ml-1">{sheetContact.conversationSubject}</span>
          </div>
          <div class="col-span-2">
            <span class="text-text-muted">Conversation ID:</span>
            <span class="font-mono ml-1 text-accent">{sheetContact.conversationId}</span>
          </div>
        </div>
      </div>

      <!-- Loading / Error -->
      {#if sheetLoading}
        <div class="mt-6 flex items-center justify-center gap-2 py-8">
          <Loader2 size={20} class="animate-spin text-text-muted" />
          <span class="text-sm text-text-muted">Loading debug info from Front API...</span>
        </div>
      {:else if sheetError}
        <div class="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p class="text-sm text-destructive-foreground">{sheetError}</p>
        </div>
      {:else if sheetDebug}
        <!-- Matching Attempts -->
        <div class="mt-6 space-y-3">
          <h3 class="text-sm font-semibold text-text-primary">Matching Attempts</h3>
          <div class="space-y-2">
            {#each sheetDebug.matchAttempts as attempt}
              <div class="flex items-start gap-2 rounded-lg border border-glass-border p-2.5">
                {#if attempt.found}
                  <CheckCircle2 size={16} class="text-[var(--badge-green-text)] mt-0.5 shrink-0" />
                {:else}
                  <XCircle size={16} class="text-text-muted mt-0.5 shrink-0" />
                {/if}
                <div class="text-xs">
                  <p class="font-medium text-text-primary">{attempt.source}</p>
                  <p class="text-text-muted">
                    Searched for: <span class="font-mono">{attempt.searchedFor}</span>
                    — {attempt.found ? "Match found" : "No match"}
                  </p>
                  {#if attempt.detail}
                    <p class="text-accent font-mono">{attempt.detail}</p>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Raw Conversation -->
        <div class="mt-6">
          <button
            type="button"
            class="flex items-center gap-1 text-sm font-semibold text-text-primary hover:text-accent transition-colors"
            onclick={() => { showRawConversation = !showRawConversation; }}
          >
            {#if showRawConversation}
              <ChevronDown size={16} />
            {:else}
              <ChevronRight size={16} />
            {/if}
            Raw Conversation
          </button>
          {#if showRawConversation}
            <pre class="mt-2 rounded-lg border border-glass-border bg-glass-bg p-3 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">{JSON.stringify(sheetDebug.conversation, null, 2)}</pre>
          {/if}
        </div>

        <!-- Raw Messages -->
        <div class="mt-4">
          <button
            type="button"
            class="flex items-center gap-1 text-sm font-semibold text-text-primary hover:text-accent transition-colors"
            onclick={() => { showRawMessages = !showRawMessages; }}
          >
            {#if showRawMessages}
              <ChevronDown size={16} />
            {:else}
              <ChevronRight size={16} />
            {/if}
            Raw Messages ({sheetDebug.messages.length})
          </button>
          {#if showRawMessages}
            <pre class="mt-2 rounded-lg border border-glass-border bg-glass-bg p-3 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">{JSON.stringify(sheetDebug.messages, null, 2)}</pre>
          {/if}
        </div>
      {/if}
    {/if}
  </Sheet.Content>
</Sheet.Root>
