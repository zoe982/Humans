<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { toast } from "svelte-sonner";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { onDestroy } from "svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showDeleteConfirm = $state(false);
  let deleteFormEl = $state<HTMLFormElement>();

  type Expression = {
    id: string;
    displayId: string;
    humanId: string;
    geoInterestId: string;
    activityId: string | null;
    notes: string | null;
    createdAt: string;
    humanName: string | null;
    humanDisplayId: string | null;
    city: string | null;
    country: string | null;
    geoDisplayId: string | null;
    activitySubject: string | null;
  };

  const expr = $derived(data.expression as Expression);

  // Editable fields
  let notes = $state("");
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);

  // Initialize from data
  $effect(() => {
    notes = expr.notes ?? "";
    if (!initialized) initialized = true;
  });

  const autoSaver = createAutoSaver({
    endpoint: `/api/geo-interest-expressions/${expr.id}`,
    onStatusChange: (s) => { saveStatus = s; },
    onSaved: () => {
      toast("Changes saved");
    },
    onError: (err) => {
      toast(`Save failed: ${err}`);
    },
  });

  onDestroy(() => autoSaver.destroy());

  function triggerSave() {
    if (!initialized) return;
    autoSaver.save({ notes: notes.trim() || null });
  }
</script>

<svelte:head>
  <title>{expr.displayId} — Geo Interest Expression - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/geo-interests/{expr.geoInterestId}"
    backLabel="Geo Interest"
    title={expr.displayId}
  />

  <!-- Geo Interest Info -->
  <div class="glass-card p-5 mb-6">
    <h2 class="text-lg font-semibold text-text-primary mb-3">Geo Interest</h2>
    <div class="flex items-center gap-3">
      <a href="/geo-interests/{expr.geoInterestId}" class="text-accent hover:text-[var(--link-hover)] font-medium">
        {expr.city ?? "\u2014"}, {expr.country ?? "\u2014"}
      </a>
      {#if expr.geoDisplayId}
        <span class="font-mono text-xs text-text-muted">{expr.geoDisplayId}</span>
      {/if}
    </div>
  </div>

  <!-- Human Info -->
  <div class="glass-card p-5 mb-6">
    <h2 class="text-lg font-semibold text-text-primary mb-3">Human</h2>
    <div class="flex items-center gap-3">
      <a href="/humans/{expr.humanId}" class="text-accent hover:text-[var(--link-hover)] font-medium">
        {expr.humanName ?? "Unknown"}
      </a>
      {#if expr.humanDisplayId}
        <span class="font-mono text-xs text-text-muted">{expr.humanDisplayId}</span>
      {/if}
    </div>
  </div>

  <!-- Editable Fields -->
  <div class="glass-card p-6 space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Details</h2>
      <SaveIndicator status={saveStatus} />
    </div>

    <!-- Notes -->
    <div>
      <label for="notes" class="block text-sm font-medium text-text-secondary mb-1">Notes</label>
      <textarea
        id="notes"
        rows="3"
        bind:value={notes}
        oninput={triggerSave}
        class="glass-input block w-full"
        placeholder="Optional notes..."
      ></textarea>
    </div>

    <!-- Activity link (read-only) -->
    {#if expr.activitySubject}
      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1">Linked Activity</label>
        {#if expr.activityId}
          <a href="/activities/{expr.activityId}" class="text-sm text-accent hover:text-[var(--link-hover)]">{expr.activitySubject}</a>
        {:else}
          <p class="text-sm text-text-primary">{expr.activitySubject}</p>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Metadata -->
  <div class="mt-6 glass-card p-5">
    <h2 class="text-lg font-semibold text-text-primary mb-3">Metadata</h2>
    <dl class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <dt class="text-text-muted">Expression ID</dt>
        <dd class="font-mono text-text-primary">{expr.displayId}</dd>
      </div>
      <div>
        <dt class="text-text-muted">Internal ID</dt>
        <dd class="font-mono text-text-secondary text-xs">{expr.id}</dd>
      </div>
      <div>
        <dt class="text-text-muted">Created</dt>
        <dd class="text-text-primary">{new Date(expr.createdAt).toLocaleString()}</dd>
      </div>
    </dl>
  </div>

  <!-- Danger Zone -->
  <div class="mt-6 rounded-xl border border-[rgba(239,68,68,0.20)] bg-[rgba(239,68,68,0.06)] p-5">
    <h2 class="text-lg font-semibold text-destructive-foreground mb-2">Danger Zone</h2>
    <p class="text-sm text-text-secondary mb-4">Permanently delete this expression. This action cannot be undone.</p>
    {#if form?.error}
      <p class="text-sm text-destructive-foreground mb-3">{form.error}</p>
    {/if}
    <button type="button" class="btn-danger text-sm" onclick={() => { showDeleteConfirm = true; }}>
      Delete Expression
    </button>
  </div>
</div>

<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden">
  <input type="hidden" name="geoInterestId" value={expr.geoInterestId} />
</form>

<ConfirmDialog
  open={showDeleteConfirm}
  message="Permanently delete this expression? This cannot be undone."
  confirmLabel="Delete Expression"
  onConfirm={() => { deleteFormEl?.requestSubmit(); showDeleteConfirm = false; }}
  onCancel={() => { showDeleteConfirm = false; }}
/>
