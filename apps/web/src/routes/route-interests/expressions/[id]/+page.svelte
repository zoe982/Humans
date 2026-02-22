<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import * as Select from "$lib/components/ui/select";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { toast } from "svelte-sonner";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { api } from "$lib/api";
  import { onDestroy } from "svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showDeleteConfirm = $state(false);
  let deleteFormEl = $state<HTMLFormElement>();

  type Expression = {
    id: string;
    displayId: string;
    humanId: string;
    routeInterestId: string;
    activityId: string | null;
    frequency: string;
    travelYear: number | null;
    travelMonth: number | null;
    travelDay: number | null;
    notes: string | null;
    createdAt: string;
    humanName: string | null;
    humanDisplayId: string | null;
    originCity: string | null;
    originCountry: string | null;
    destinationCity: string | null;
    destinationCountry: string | null;
    routeDisplayId: string | null;
    activitySubject: string | null;
  };

  const expr = $derived(data.expression as Expression);

  const MONTH_OPTIONS = [
    { value: "1", label: "01 - January" },
    { value: "2", label: "02 - February" },
    { value: "3", label: "03 - March" },
    { value: "4", label: "04 - April" },
    { value: "5", label: "05 - May" },
    { value: "6", label: "06 - June" },
    { value: "7", label: "07 - July" },
    { value: "8", label: "08 - August" },
    { value: "9", label: "09 - September" },
    { value: "10", label: "10 - October" },
    { value: "11", label: "11 - November" },
    { value: "12", label: "12 - December" },
  ];

  function monthLabel(m: number | null): string {
    if (m == null) return "";
    const opt = MONTH_OPTIONS.find((o) => o.value === String(m));
    return opt?.label ?? String(m);
  }

  // Editable fields
  let frequency = $state("one_time");
  let travelYear = $state("");
  let travelMonth = $state("");
  let travelDay = $state("");
  let notes = $state("");
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);

  // Initialize from data
  $effect(() => {
    frequency = expr.frequency;
    travelYear = expr.travelYear != null ? String(expr.travelYear) : "";
    travelMonth = expr.travelMonth != null ? String(expr.travelMonth) : "";
    travelDay = expr.travelDay != null ? String(expr.travelDay) : "";
    notes = expr.notes ?? "";
    if (!initialized) initialized = true;
  });

  const autoSaver = createAutoSaver({
    endpoint: `/api/route-interest-expressions/${expr.id}`,
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
    autoSaver.save(buildPayload());
  }

  function triggerSaveImmediate() {
    if (!initialized) return;
    autoSaver.saveImmediate(buildPayload());
  }

  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      frequency,
      notes: notes.trim() || null,
      travelYear: travelYear ? parseInt(travelYear, 10) : null,
      travelMonth: travelMonth ? parseInt(travelMonth, 10) : null,
      travelDay: travelDay ? parseInt(travelDay, 10) : null,
    };
    return payload;
  }
</script>

<svelte:head>
  <title>{expr.displayId} — Route Interest Expression - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/route-interests/{expr.routeInterestId}"
    backLabel="Route Interest"
    title={expr.displayId}
  />

  <!-- Route Info -->
  <div class="glass-card p-5 mb-6">
    <h2 class="text-lg font-semibold text-text-primary mb-3">Route</h2>
    <div class="flex items-center gap-3">
      <a href="/route-interests/{expr.routeInterestId}" class="text-accent hover:text-[var(--link-hover)] font-medium">
        {expr.originCity ?? "\u2014"}, {expr.originCountry ?? "\u2014"} &rarr; {expr.destinationCity ?? "\u2014"}, {expr.destinationCountry ?? "\u2014"}
      </a>
      {#if expr.routeDisplayId}
        <span class="font-mono text-xs text-text-muted">{expr.routeDisplayId}</span>
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

    <!-- Frequency -->
    <div>
      <label for="frequency" class="block text-sm font-medium text-text-secondary mb-1">Frequency</label>
      <Select.Root type="single" value={frequency} onValueChange={(v) => { if (v) { frequency = v; triggerSaveImmediate(); } }}>
        <Select.Trigger class="w-full sm:w-48 text-sm">
          {frequency === "repeat" ? "Repeat" : "One-time"}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="one_time">One-time</Select.Item>
          <Select.Item value="repeat">Repeat</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Travel Date -->
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">Travel Date</label>
      <div class="grid gap-3 grid-cols-3 max-w-md">
        <div>
          <label for="travelYear" class="block text-xs text-text-muted mb-0.5">Year</label>
          <input
            id="travelYear"
            type="number"
            min="2020"
            max="2100"
            placeholder="Year"
            bind:value={travelYear}
            oninput={triggerSave}
            class="glass-input block w-full"
          />
        </div>
        <div>
          <label class="block text-xs text-text-muted mb-0.5">Month</label>
          <SearchableSelect
            options={MONTH_OPTIONS}
            name="travelMonth"
            value={travelMonth}
            placeholder="Month..."
            emptyOption="None"
            emptyMessage="No match"
            onSelect={(v) => { travelMonth = v; triggerSaveImmediate(); }}
          />
        </div>
        <div>
          <label for="travelDay" class="block text-xs text-text-muted mb-0.5">Day</label>
          <input
            id="travelDay"
            type="number"
            min="1"
            max="31"
            placeholder="Day"
            bind:value={travelDay}
            oninput={triggerSave}
            class="glass-input block w-full"
          />
        </div>
      </div>
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
  <input type="hidden" name="routeInterestId" value={expr.routeInterestId} />
</form>

<ConfirmDialog
  open={showDeleteConfirm}
  message="Permanently delete this expression? This cannot be undone."
  confirmLabel="Delete Expression"
  onConfirm={() => { deleteFormEl?.requestSubmit(); showDeleteConfirm = false; }}
  onCancel={() => { showDeleteConfirm = false; }}
/>
