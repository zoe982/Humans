<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import { Trash2 } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import { formatRelativeTime, summarizeChanges } from "$lib/utils/format";
  import { createChangeHistoryLoader } from "$lib/changeHistory";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type FormResult = { error?: string; success?: boolean } | null;

  type Expression = {
    id: string;
    humanId: string;
    geoInterestId: string;
    activityId: string | null;
    notes: string | null;
    createdAt: string;
    humanName: string | null;
    activitySubject: string | null;
  };

  type GeoInterest = {
    id: string;
    city: string;
    country: string;
    createdAt: string;
    expressions: Expression[];
  };

  type Human = {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
  };

  const geoInterest = $derived(data.geoInterest as GeoInterest);
  const humans = $derived(data.humans as Human[]);

  let humanSearch = $state("");
  let selectedHumanId = $state("");
  let showHumanDropdown = $state(false);
  let notes = $state("");

  function humanDisplayName(h: Human): string {
    return [h.firstName, h.middleName, h.lastName].filter(Boolean).join(" ");
  }

  const filteredHumans = $derived(
    humanSearch.trim().length === 0
      ? humans
      : humans.filter((h) =>
          humanDisplayName(h).toLowerCase().includes(humanSearch.toLowerCase())
        )
  );

  function selectHuman(h: Human) {
    selectedHumanId = h.id;
    humanSearch = humanDisplayName(h);
    showHumanDropdown = false;
  }

  function handleHumanInput() {
    showHumanDropdown = true;
    selectedHumanId = "";
  }

  function handleHumanBlur() {
    setTimeout(() => {
      showHumanDropdown = false;
    }, 200);
  }

  function resetAddForm() {
    humanSearch = "";
    selectedHumanId = "";
    notes = "";
  }

  let showDeleteConfirm = $state(false);
  let deleteFormEl = $state<HTMLFormElement>();

  const formResult = $derived(form as FormResult);

  $effect(() => {
    if (formResult?.success) {
      resetAddForm();
    }
  });

  const expressionColumns = [
    { key: "human", label: "Human", sortable: true, sortValue: (e: Expression) => e.humanName ?? "" },
    { key: "activity", label: "Activity", sortable: true, sortValue: (e: Expression) => e.activitySubject ?? "" },
    { key: "notes", label: "Notes", sortable: true, sortValue: (e: Expression) => e.notes ?? "" },
    { key: "date", label: "Date", sortable: true, sortValue: (e: Expression) => e.createdAt },
    { key: "delete", label: "", headerClass: "w-10" },
  ];

  // Change history
  const history = createChangeHistoryLoader("geo_interest", geoInterest.id);

  $effect(() => {
    if (!history.historyLoaded) {
      void history.loadHistory();
    }
  });
</script>

<svelte:head>
  <title>{geoInterest.city}, {geoInterest.country} - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/geo-interests"
    backLabel="Geo-Interests"
    title="{geoInterest.city}, {geoInterest.country}"
  />

  {#if formResult?.error}
    <AlertBanner type="error" message={formResult.error} />
  {/if}
  {#if formResult?.success}
    <AlertBanner type="success" message="Expression added." />
  {/if}

  <!-- Delete geo-interest -->
  <div class="mb-6 flex justify-end">
    <button type="button" class="btn-danger text-sm" onclick={() => { showDeleteConfirm = true; }}>
      Delete Geo-Interest
    </button>
  </div>

  <!-- Expressions -->
  <RelatedListTable
    title="Expressions ({geoInterest.expressions.length})"
    items={geoInterest.expressions}
    columns={expressionColumns}
    defaultSortKey="date"
    defaultSortDirection="desc"
    searchFilter={(e, q) =>
      (e.humanName ?? "").toLowerCase().includes(q) ||
      (e.activitySubject ?? "").toLowerCase().includes(q) ||
      (e.notes ?? "").toLowerCase().includes(q)}
    searchEmptyMessage="No expressions match your search."
    addLabel="Expression"
    onFormToggle={(open) => { if (!open) resetAddForm(); }}
  >
    {#snippet row(expr, _searchQuery)}
      <td>
        {#if expr.humanName}
          <a href="/humans/{expr.humanId}" class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">{expr.humanName}</a>
        {:else}
          <span class="text-sm text-text-muted">Unknown human</span>
        {/if}
      </td>
      <td class="text-xs text-text-muted">{expr.activitySubject ?? "—"}</td>
      <td class="text-sm text-text-secondary max-w-xs truncate">{expr.notes ?? "—"}</td>
      <td class="text-xs text-text-muted">{new Date(expr.createdAt).toLocaleDateString()}</td>
      <td>
        <form method="POST" action="?/deleteExpression">
          <input type="hidden" name="expressionId" value={expr.id} />
          <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete expression">
            <Trash2 size={14} />
          </button>
        </form>
      </td>
    {/snippet}

    {#snippet addForm()}
      <form method="POST" action="?/createExpression" class="space-y-3">
        <input type="hidden" name="humanId" value={selectedHumanId} />
        <div class="relative">
          <label for="humanSearch" class="block text-sm font-medium text-text-secondary mb-1">Human</label>
          <input
            id="humanSearch"
            type="text"
            autocomplete="off"
            bind:value={humanSearch}
            oninput={handleHumanInput}
            onfocus={() => (showHumanDropdown = true)}
            onblur={handleHumanBlur}
            placeholder="Search humans..."
            class="glass-input block w-full px-3 py-2 text-sm"
          />
          {#if showHumanDropdown && filteredHumans.length > 0}
            <div class="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-glass-border bg-surface-raised shadow-lg">
              {#each filteredHumans as h (h.id)}
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-glass-hover transition-colors {h.id === selectedHumanId ? 'bg-accent-dim text-accent' : ''}"
                  onmousedown={(e) => { e.preventDefault(); selectHuman(h); }}
                >
                  {humanDisplayName(h)}
                </button>
              {/each}
            </div>
          {/if}
          {#if showHumanDropdown && filteredHumans.length === 0 && humanSearch.trim().length > 0}
            <div class="absolute z-50 mt-1 w-full rounded-lg border border-glass-border bg-surface-raised shadow-lg">
              <p class="px-3 py-2 text-sm text-text-muted">No humans found.</p>
            </div>
          {/if}
        </div>
        <div>
          <label for="notes" class="block text-sm font-medium text-text-secondary mb-1">Notes (optional)</label>
          <textarea
            id="notes" name="notes"
            bind:value={notes}
            rows="2"
            placeholder="Any notes about this expression of interest..."
            class="glass-input block w-full px-3 py-2 text-sm"
          ></textarea>
        </div>
        <div class="flex gap-3">
          <Button type="submit" size="sm" disabled={!selectedHumanId}>
            Add Expression
          </Button>
        </div>
      </form>
    {/snippet}
  </RelatedListTable>

  <!-- Change History -->
  <div class="mt-6">
    <RelatedListTable
      title="Change History"
      items={history.historyEntries}
      columns={[
        { key: "colleague", label: "Colleague", sortable: true, sortValue: (e) => e.colleagueName ?? "" },
        { key: "action", label: "Action", sortable: true, sortValue: (e) => e.action },
        { key: "time", label: "Time", sortable: true, sortValue: (e) => e.createdAt },
        { key: "changes", label: "Changes", sortable: true, sortValue: (e) => summarizeChanges(e.changes) },
      ]}
      defaultSortKey="time"
      defaultSortDirection="desc"
      searchFilter={(e, q) =>
        (e.colleagueName ?? "").toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        summarizeChanges(e.changes).toLowerCase().includes(q)}
      searchEmptyMessage="No history entries match your search."
      emptyMessage="No changes recorded yet."
    >
      {#snippet row(entry, _searchQuery)}
        <td class="text-sm font-medium text-text-primary">{entry.colleagueName ?? "System"}</td>
        <td>
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-secondary">
            {entry.action}
          </span>
        </td>
        <td class="text-sm text-text-muted whitespace-nowrap">{formatRelativeTime(entry.createdAt)}</td>
        <td class="text-xs text-text-secondary max-w-sm truncate">{summarizeChanges(entry.changes)}</td>
      {/snippet}
    </RelatedListTable>
  </div>
</div>

<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden"></form>

<ConfirmDialog
  open={showDeleteConfirm}
  message="Delete this geo-interest and all its expressions?"
  onConfirm={() => { deleteFormEl?.requestSubmit(); showDeleteConfirm = false; }}
  onCancel={() => { showDeleteConfirm = false; }}
/>
