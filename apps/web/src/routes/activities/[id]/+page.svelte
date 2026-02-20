<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import LinkedRecordBox from "$lib/components/LinkedRecordBox.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import GeoInterestPicker from "$lib/components/GeoInterestPicker.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import Toast from "$lib/components/Toast.svelte";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { onDestroy } from "svelte";
  import { activityTypeLabels } from "$lib/constants/labels";
  import { displayName } from "$lib/utils/format";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type GeoInterestExpression = {
    id: string;
    humanId: string;
    geoInterestId: string;
    activityId: string | null;
    notes: string | null;
    city: string | null;
    country: string | null;
    createdAt: string;
  };
  type Human = { id: string; firstName: string; middleName: string | null; lastName: string };
  type Account = { id: string; name: string };
  type Activity = {
    id: string;
    type: string;
    subject: string;
    notes: string | null;
    body: string | null;
    activityDate: string;
    humanId: string | null;
    humanName: string | null;
    accountId: string | null;
    accountName: string | null;
    routeSignupId: string | null;
    geoInterestExpressions: GeoInterestExpression[];
    createdByColleagueId: string;
    createdAt: string;
    updatedAt: string;
  };

  const activity = $derived(data.activity as Activity);
  const humans = $derived(data.humans as Human[]);
  const accountsList = $derived(data.accounts as Account[]);
  const apiUrl = $derived(data.apiUrl as string);

  // Auto-save state
  let type = $state("");
  let subject = $state("");
  let notes = $state("");
  let activityDate = $state("");
  let humanId = $state("");
  let accountId = $state("");
  let saveStatus = $state<SaveStatus>("idle");
  let toastMessage = $state<string | null>(null);
  let initialized = $state(false);

  // Initialize state from data
  $effect(() => {
    type = activity.type;
    subject = activity.subject;
    notes = activity.notes ?? "";
    // Convert ISO date to datetime-local format
    activityDate = activity.activityDate
      ? activity.activityDate.slice(0, 16)
      : "";
    humanId = activity.humanId ?? "";
    accountId = activity.accountId ?? "";
    if (!initialized) initialized = true;
  });

  const autoSaver = createAutoSaver({
    endpoint: `/api/activities/${activity.id}`,
    onStatusChange: (s) => { saveStatus = s; },
    onSaved: () => {
      toastMessage = "Changes saved";
    },
    onError: (err) => {
      toastMessage = `Save failed: ${err}`;
    },
  });

  onDestroy(() => autoSaver.destroy());

  function buildPayload() {
    return {
      type,
      subject,
      notes: notes || null,
      activityDate: activityDate ? new Date(activityDate).toISOString() : undefined,
      humanId: humanId || null,
      accountId: accountId || null,
    };
  }

  function triggerSave() {
    if (!initialized) return;
    autoSaver.save(buildPayload());
  }

  function triggerSaveImmediate() {
    if (!initialized) return;
    autoSaver.saveImmediate(buildPayload());
  }

  let showDeleteConfirm = $state(false);
  let deleteFormEl = $state<HTMLFormElement>();
</script>

<svelte:head>
  <title>{activity.subject || activityTypeLabels[activity.type] || "Activity"} - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/activities"
    backLabel="Activities"
    title={activity.subject || activityTypeLabels[activity.type] || "Activity"}
  >
    {#snippet actions()}
      <button type="button" class="btn-danger text-sm py-1.5 px-3" onclick={() => { showDeleteConfirm = true; }}>Delete</button>
    {/snippet}
  </RecordManagementBar>

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <!-- Details (auto-save) -->
  <div class="glass-card p-6 space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Details</h2>
      <SaveIndicator status={saveStatus} />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="type" class="block text-sm font-medium text-text-secondary">Type</label>
        <select
          id="type"
          bind:value={type}
          onchange={triggerSaveImmediate}
          class="glass-input mt-1 block w-full"
        >
          <option value="email">Email</option>
          <option value="whatsapp_message">WhatsApp</option>
          <option value="online_meeting">Meeting</option>
          <option value="phone_call">Phone Call</option>
        </select>
      </div>
      <div>
        <label for="activityDate" class="block text-sm font-medium text-text-secondary">Activity Date</label>
        <input
          id="activityDate"
          type="datetime-local"
          bind:value={activityDate}
          onchange={triggerSaveImmediate}
          class="glass-input mt-1 block w-full"
        />
      </div>
    </div>

    <div>
      <label for="subject" class="block text-sm font-medium text-text-secondary">Subject</label>
      <input
        id="subject"
        type="text"
        bind:value={subject}
        oninput={triggerSave}
        class="glass-input mt-1 block w-full"
        placeholder="Activity subject"
      />
    </div>

    <div>
      <label for="notes" class="block text-sm font-medium text-text-secondary">Notes</label>
      <textarea
        id="notes"
        bind:value={notes}
        oninput={triggerSave}
        rows={4}
        class="glass-input mt-1 block w-full"
        placeholder="Optional notes..."
      ></textarea>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="humanId" class="block text-sm font-medium text-text-secondary">Linked Human</label>
        <select
          id="humanId"
          bind:value={humanId}
          onchange={triggerSaveImmediate}
          class="glass-input mt-1 block w-full"
        >
          <option value="">— None —</option>
          {#each humans as human (human.id)}
            <option value={human.id}>{displayName(human)}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="accountId" class="block text-sm font-medium text-text-secondary">Linked Account</label>
        <select
          id="accountId"
          bind:value={accountId}
          onchange={triggerSaveImmediate}
          class="glass-input mt-1 block w-full"
        >
          <option value="">— None —</option>
          {#each accountsList as account (account.id)}
            <option value={account.id}>{account.name}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>

  <!-- Geo-Interest Expressions -->
  <div class="mt-6">
    <LinkedRecordBox
      title="Geo-Interest Expressions"
      items={activity.geoInterestExpressions}
      emptyMessage="No geo-interest expressions yet."
      addLabel="Geo-Interest"
      deleteFormAction="?/deleteGeoInterestExpression"
    >
      {#snippet itemRow(item)}
        {@const expr = item as unknown as GeoInterestExpression}
        <div>
          <div class="flex items-center gap-3">
            <a href="/geo-interests/{expr.geoInterestId}" class="text-sm font-medium text-accent hover:text-cyan-300">
              {expr.city ?? "—"}, {expr.country ?? "—"}
            </a>
          </div>
          {#if expr.notes}
            <p class="mt-0.5 text-sm text-text-secondary">{expr.notes}</p>
          {/if}
        </div>
      {/snippet}
      {#snippet addForm()}
        {#if humanId}
          <form method="POST" action="?/addGeoInterestExpression" class="space-y-3">
            <input type="hidden" name="humanId" value={humanId} />
            <GeoInterestPicker {apiUrl} />
            <button type="submit" class="btn-primary text-sm">
              Add Geo-Interest Expression
            </button>
          </form>
        {:else}
          <p class="text-sm text-text-muted">Link a human to this activity first to add geo-interest expressions.</p>
        {/if}
      {/snippet}
    </LinkedRecordBox>
  </div>

  <!-- Metadata -->
  <div class="mt-6 glass-card p-5">
    <h2 class="text-lg font-semibold text-text-primary mb-3">Metadata</h2>
    <div class="grid gap-2 text-sm text-text-secondary">
      <p>Created: {new Date(activity.createdAt).toLocaleString()}</p>
      <p>Updated: {new Date(activity.updatedAt).toLocaleString()}</p>
      <p>Created by: {activity.createdByColleagueId}</p>
    </div>
  </div>
</div>

{#if toastMessage}
  <Toast
    message={toastMessage}
    onDismiss={() => { toastMessage = null; }}
  />
{/if}

<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden"></form>

<ConfirmDialog
  open={showDeleteConfirm}
  message="Are you sure you want to delete this activity?"
  onConfirm={() => { deleteFormEl?.requestSubmit(); showDeleteConfirm = false; }}
  onCancel={() => { showDeleteConfirm = false; }}
/>
