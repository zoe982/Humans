<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import GeoInterestPicker from "$lib/components/GeoInterestPicker.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import { Trash2 } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { onDestroy } from "svelte";
  import { activityTypeLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import { displayName } from "$lib/utils/format";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import RouteInterestPicker from "$lib/components/RouteInterestPicker.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { Button } from "$lib/components/ui/button";

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
  type RouteInterestExpression = {
    id: string;
    humanId: string;
    routeInterestId: string;
    activityId: string | null;
    frequency: string;
    travelYear: number | null;
    travelMonth: number | null;
    travelDay: number | null;
    notes: string | null;
    originCity: string | null;
    originCountry: string | null;
    destinationCity: string | null;
    destinationCountry: string | null;
    createdAt: string;
  };
  type Human = { id: string; firstName: string; middleName: string | null; lastName: string };
  type Account = { id: string; name: string };
  type Activity = {
    id: string;
    displayId: string;
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
    websiteBookingRequestId: string | null;
    geoInterestExpressions: GeoInterestExpression[];
    routeInterestExpressions: RouteInterestExpression[];
    colleagueId: string | null;
    createdAt: string;
    updatedAt: string;
  };

  const activity = $derived(data.activity as Activity);
  const humans = $derived(data.humans as Human[]);
  const accountsList = $derived(data.accounts as Account[]);
  const apiUrl = $derived(data.apiUrl as string);

  const humanOptions = $derived(humans.map((h) => ({ value: h.id, label: displayName(h) })));
  const accountOptions = $derived(accountsList.map((a) => ({ value: a.id, label: a.name })));

  // Auto-save state
  let type = $state("");
  let subject = $state("");
  let notes = $state("");
  let activityDate = $state("");
  let humanId = $state("");
  let accountId = $state("");
  let saveStatus = $state<SaveStatus>("idle");
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
      toast("Changes saved");
    },
    onError: (err) => {
      toast(`Save failed: ${err}`);
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

  const metadataItems = $derived([
    { id: "created", field: "Created", value: new Date(activity.createdAt).toLocaleString() },
    { id: "updated", field: "Updated", value: new Date(activity.updatedAt).toLocaleString() },
    { id: "createdBy", field: "Created by", value: activity.colleagueId ?? "—" },
  ]);
</script>

<svelte:head>
  <title>{activity.displayId} — {activity.subject || activityTypeLabels[activity.type] || "Activity"} - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/activities"
    backLabel="Activities"
    title="{activity.displayId} — {activity.subject || activityTypeLabels[activity.type] || 'Activity'}"
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
        <SearchableSelect
          options={ACTIVITY_TYPE_OPTIONS}
          name="type"
          id="type"
          value={type}
          placeholder="Select type..."
          onSelect={(v) => { type = v; triggerSaveImmediate(); }}
        />
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
        <SearchableSelect
          options={humanOptions}
          name="humanId"
          id="humanId"
          value={humanId}
          emptyOption="— None —"
          placeholder="Search humans..."
          onSelect={(v) => { humanId = v; triggerSaveImmediate(); }}
        />
      </div>
      <div>
        <label for="accountId" class="block text-sm font-medium text-text-secondary">Linked Account</label>
        <SearchableSelect
          options={accountOptions}
          name="accountId"
          id="accountId"
          value={accountId}
          emptyOption="— None —"
          placeholder="Search accounts..."
          onSelect={(v) => { accountId = v; triggerSaveImmediate(); }}
        />
      </div>
    </div>

    {#if activity.routeSignupId || activity.websiteBookingRequestId}
      <div class="grid gap-4 sm:grid-cols-2">
        {#if activity.routeSignupId}
          <div>
            <span class="block text-sm font-medium text-text-secondary">Linked Route Signup</span>
            <a href="/leads/route-signups/{activity.routeSignupId}" class="text-sm text-accent hover:text-cyan-300">
              View Route Signup
            </a>
          </div>
        {/if}
        {#if activity.websiteBookingRequestId}
          <div>
            <span class="block text-sm font-medium text-text-secondary">Linked Booking Request</span>
            <a href="/leads/website-booking-requests/{activity.websiteBookingRequestId}" class="text-sm text-accent hover:text-cyan-300">
              View Booking Request
            </a>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Geo-Interest Expressions -->
  <div class="mt-6">
    <RelatedListTable
      title="Geo-Interest Expressions"
      items={activity.geoInterestExpressions}
      columns={[
        { key: "location", label: "Location" },
        { key: "notes", label: "Notes" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      emptyMessage="No geo-interest expressions yet."
      addLabel="Geo-Interest"
    >
      {#snippet row(item, _searchQuery)}
        {@const expr = item as unknown as GeoInterestExpression}
        <td>
          <a href="/geo-interests/{expr.geoInterestId}" class="text-sm font-medium text-accent hover:text-cyan-300">
            {expr.city ?? "—"}, {expr.country ?? "—"}
          </a>
        </td>
        <td class="text-sm text-text-secondary">{expr.notes ?? "—"}</td>
        <td>
          <form method="POST" action="?/deleteGeoInterestExpression">
            <input type="hidden" name="id" value={expr.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-red-400 hover:bg-[rgba(239,68,68,0.12)] transition-colors duration-150" aria-label="Delete expression">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        {#if humanId}
          <form method="POST" action="?/addGeoInterestExpression" class="space-y-3">
            <input type="hidden" name="humanId" value={humanId} />
            <GeoInterestPicker {apiUrl} />
            <Button type="submit" size="sm">
              Add Geo-Interest Expression
            </Button>
          </form>
        {:else}
          <p class="text-sm text-text-muted">Link a human to this activity first to add geo-interest expressions.</p>
        {/if}
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Route-Interest Expressions -->
  <div class="mt-6">
    <RelatedListTable
      title="Route-Interest Expressions"
      items={activity.routeInterestExpressions}
      columns={[
        { key: "route", label: "Route" },
        { key: "frequency", label: "Frequency" },
        { key: "notes", label: "Notes" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      emptyMessage="No route-interest expressions yet."
      addLabel="Route-Interest"
    >
      {#snippet row(item, _searchQuery)}
        {@const expr = item as unknown as RouteInterestExpression}
        <td>
          <a href="/route-interests/{expr.routeInterestId}" class="text-sm font-medium text-accent hover:text-cyan-300">
            {expr.originCity ?? "—"}, {expr.originCountry ?? "—"} &rarr; {expr.destinationCity ?? "—"}, {expr.destinationCountry ?? "—"}
          </a>
        </td>
        <td class="text-sm text-text-secondary">{expr.frequency === "repeat" ? "Repeat" : "One-time"}</td>
        <td class="text-sm text-text-secondary">{expr.notes ?? "—"}</td>
        <td>
          <form method="POST" action="?/deleteRouteInterestExpression">
            <input type="hidden" name="id" value={expr.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-red-400 hover:bg-[rgba(239,68,68,0.12)] transition-colors duration-150" aria-label="Delete expression">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        {#if humanId}
          <form method="POST" action="?/addRouteInterestExpression" class="space-y-3">
            <input type="hidden" name="humanId" value={humanId} />
            <RouteInterestPicker {apiUrl} />
            <Button type="submit" size="sm">
              Add Route-Interest Expression
            </Button>
          </form>
        {:else}
          <p class="text-sm text-text-muted">Link a human to this activity first to add route-interest expressions.</p>
        {/if}
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Metadata -->
  <div class="mt-6">
    <RelatedListTable
      title="Metadata"
      items={metadataItems}
      columns={[
        { key: "field", label: "Field" },
        { key: "value", label: "Value" },
      ]}
    >
      {#snippet row(item, _searchQuery)}
        <td class="text-sm font-medium text-text-secondary">{item.field}</td>
        <td class="text-sm text-text-primary">{item.value}</td>
      {/snippet}
    </RelatedListTable>
  </div>
</div>

<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden"></form>

<ConfirmDialog
  open={showDeleteConfirm}
  message="Are you sure you want to delete this activity?"
  onConfirm={() => { deleteFormEl?.requestSubmit(); showDeleteConfirm = false; }}
  onCancel={() => { showDeleteConfirm = false; }}
/>
