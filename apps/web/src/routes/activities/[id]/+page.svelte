<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import GeoInterestPicker from "$lib/components/GeoInterestPicker.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import { Trash2, Unlink } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { onDestroy } from "svelte";
  import { activityTypeLabels, ACTIVITY_TYPE_OPTIONS, opportunityStageLabels } from "$lib/constants/labels";
  import { opportunityStageColors } from "$lib/constants/colors";
  import { displayName, formatRelativeTime, formatDateTime, summarizeChanges } from "$lib/utils/format";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { createChangeHistoryLoader } from "$lib/changeHistory.svelte";
  import RouteInterestPicker from "$lib/components/RouteInterestPicker.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { Button } from "$lib/components/ui/button";
  import { resolve } from "$app/paths";
  import { page } from "$app/stores";

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
  type LinkedOpportunity = {
    id: string;
    opportunityId: string;
    displayId: string;
    stage: string;
    createdAt: string;
  };
  type Human = { id: string; displayId: string; firstName: string; middleName: string | null; lastName: string };
  type Account = { id: string; displayId: string; name: string };
  type Colleague = { id: string; name: string; displayId: string };
  type GeneralLead = { id: string; displayId: string; source: string; status: string; email: string | null; phone: string | null };
  type Opportunity = { id: string; displayId: string; stage: string };
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
    generalLeadId: string | null;
    frontId: string | null;
    frontConversationId: string | null;
    geoInterestExpressions: GeoInterestExpression[];
    routeInterestExpressions: RouteInterestExpression[];
    linkedOpportunities: LinkedOpportunity[];
    ownerId: string | null;
    ownerName: string | null;
    ownerDisplayId: string | null;
    createdAt: string;
    updatedAt: string;
  };

  type RouteSignup = { id: string; display_id: string | null; first_name: string | null; last_name: string | null; origin: string | null; destination: string | null };
  type WebsiteBookingRequest = { id: string; crm_display_id: string | null; passenger_name: string | null; origin: string | null; destination: string | null };

  const activity = $derived(data.activity as Activity);
  const humans = $derived(data.humans as Human[]);
  const accountsList = $derived(data.accounts as Account[]);
  const routeSignups = $derived((data.routeSignups ?? []) as RouteSignup[]);
  const websiteBookingRequests = $derived((data.websiteBookingRequests ?? []) as WebsiteBookingRequest[]);
  const colleaguesList = $derived((data.colleagues ?? []) as Colleague[]);
  const generalLeadsList = $derived((data.generalLeads ?? []) as GeneralLead[]);
  const opportunitiesList = $derived((data.opportunitiesList ?? []) as Opportunity[]);
  const apiUrl = $derived(data.apiUrl as string);

  const isFrontSynced = $derived(!!activity.frontId);

  const humanOptions = $derived(humans.map((h) => ({ value: h.id, label: `${h.displayId} ${displayName(h)}` })));
  const accountOptions = $derived(accountsList.map((a) => ({ value: a.id, label: `${a.displayId} ${a.name}` })));
  const routeSignupOptions = $derived(routeSignups.map((s) => ({
    value: s.id,
    label: `${s.display_id ?? s.id.slice(0, 8)} ${s.first_name ?? ""} ${s.last_name ?? ""} (${s.origin ?? "?"} → ${s.destination ?? "?"})`.trim(),
  })));
  const bookingRequestOptions = $derived(websiteBookingRequests.map((b) => ({
    value: b.id,
    label: `${b.crm_display_id ?? b.id.slice(0, 8)} ${b.passenger_name ?? "Unknown"} (${b.origin ?? "?"} → ${b.destination ?? "?"})`.trim(),
  })));
  const colleagueOptions = $derived(colleaguesList.map((c) => ({ value: c.id, label: `${c.displayId} ${c.name}` })));
  const generalLeadOptions = $derived(generalLeadsList.map((g) => ({ value: g.id, label: `${g.displayId} ${g.source} — ${g.email ?? g.phone ?? "No contact"}` })));
  const opportunityOptions = $derived(opportunitiesList.map((o) => ({ value: o.id, label: `${o.displayId} (${opportunityStageLabels[o.stage] ?? o.stage})` })));

  // Auto-save state
  let type = $state("");
  let subject = $state("");
  let notes = $state("");
  let activityDate = $state("");
  let humanId = $state("");
  let accountId = $state("");
  let routeSignupId = $state("");
  let websiteBookingRequestId = $state("");
  let generalLeadId = $state("");
  let ownerId = $state("");
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);

  // Change history and auto-saver
  let autoSaver: ReturnType<typeof createAutoSaver>;

  function initServices() {
    const _history = createChangeHistoryLoader("activity", activity.id);
    autoSaver = createAutoSaver({
      endpoint: `/api/activities/${activity.id}`,
      onStatusChange: (s) => { saveStatus = s; },
      onSaved: () => {
        toast("Changes saved");
        _history.resetHistory();
      },
      onError: (err) => {
        toast(`Save failed: ${err}`);
      },
    });
    return _history;
  }
  const history = initServices();

  $effect(() => {
    if (!history.historyLoaded) {
      void history.loadHistory();
    }
  });

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
    routeSignupId = activity.routeSignupId ?? "";
    websiteBookingRequestId = activity.websiteBookingRequestId ?? "";
    generalLeadId = activity.generalLeadId ?? "";
    ownerId = activity.ownerId ?? "";
    if (!initialized) initialized = true;
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
      routeSignupId: routeSignupId || null,
      websiteBookingRequestId: websiteBookingRequestId || null,
      generalLeadId: generalLeadId || null,
      ownerId: ownerId || null,
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
    { id: "created", field: "Created", value: formatDateTime(activity.createdAt) },
    { id: "updated", field: "Updated", value: formatDateTime(activity.updatedAt) },
    { id: "createdBy", field: "Created by", value: isFrontSynced ? "Front.com Sync" : (activity.ownerName ? `${activity.ownerName} (${activity.ownerDisplayId})` : "—") },
    { id: "frontId", field: "Front Message ID", value: activity.frontId ?? "—" },
    { id: "frontConversationId", field: "Front Conversation ID", value: activity.frontConversationId ?? "—" },
  ]);
</script>

<svelte:head>
  <title>{activity.displayId} — {activity.subject || activityTypeLabels[activity.type] || "Activity"} - Humans</title>
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

  <!-- Details + Metadata two-column layout -->
  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Card 1: Details (Type, Owner, Activity Date) -->
    <div class="glass-card p-6 space-y-6">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold text-text-primary">Details</h2>
        <SaveIndicator status={saveStatus} />
      </div>

      <div class="grid gap-4">
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
          <label for="ownerId" class="block text-sm font-medium text-text-secondary">Owner</label>
          <SearchableSelect
            options={colleagueOptions}
            name="ownerId"
            id="ownerId"
            value={ownerId}
            emptyOption="— None —"
            placeholder="Search colleagues..."
            onSelect={(v) => { ownerId = v; triggerSaveImmediate(); }}
          />
        </div>
        <div>
          <label for="activityDate" class="block text-sm font-medium text-text-secondary">Activity Date</label>
          <input
            id="activityDate"
            type="datetime-local"
            bind:value={activityDate}
            onchange={() => { if (!isFrontSynced) triggerSaveImmediate(); }}
            disabled={isFrontSynced}
            class="glass-input mt-1 block w-full {isFrontSynced ? 'opacity-50 cursor-not-allowed' : ''}"
          />
        </div>
      </div>
    </div>

    <!-- Card 2: Metadata -->
    <div>
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

  <!-- Card 2: Relationships -->
  <div class="mt-6 glass-card p-6 space-y-6">
    <h2 class="text-lg font-semibold text-text-primary">Relationships</h2>

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
        {#if humanId}
          <a href={resolve(`/humans/${humanId}?from=${$page.url.pathname}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">View Human</a>
        {/if}
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
        {#if accountId}
          <a href={resolve(`/accounts/${accountId}?from=${$page.url.pathname}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">View Account</a>
        {/if}
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="routeSignupId" class="block text-sm font-medium text-text-secondary">Linked Route Signup</label>
        <SearchableSelect
          options={routeSignupOptions}
          name="routeSignupId"
          id="routeSignupId"
          value={routeSignupId}
          emptyOption="— None —"
          placeholder="Search route signups..."
          onSelect={(v) => { routeSignupId = v; triggerSaveImmediate(); }}
        />
        {#if routeSignupId}
          <a href={resolve(`/leads/route-signups/${routeSignupId}?from=${$page.url.pathname}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">View Route Signup</a>
        {/if}
      </div>
      <div>
        <label for="websiteBookingRequestId" class="block text-sm font-medium text-text-secondary">Linked Booking Request</label>
        <SearchableSelect
          options={bookingRequestOptions}
          name="websiteBookingRequestId"
          id="websiteBookingRequestId"
          value={websiteBookingRequestId}
          emptyOption="— None —"
          placeholder="Search booking requests..."
          onSelect={(v) => { websiteBookingRequestId = v; triggerSaveImmediate(); }}
        />
        {#if websiteBookingRequestId}
          <a href={resolve(`/leads/website-booking-requests/${websiteBookingRequestId}?from=${$page.url.pathname}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">View Booking Request</a>
        {/if}
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="generalLeadId" class="block text-sm font-medium text-text-secondary">Linked General Lead</label>
        <SearchableSelect
          options={generalLeadOptions}
          name="generalLeadId"
          id="generalLeadId"
          value={generalLeadId}
          emptyOption="— None —"
          placeholder="Search general leads..."
          onSelect={(v) => { generalLeadId = v; triggerSaveImmediate(); }}
        />
        {#if generalLeadId}
          <a href={resolve(`/leads/general-leads/${generalLeadId}?from=${$page.url.pathname}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">View General Lead</a>
        {/if}
      </div>
    </div>
  </div>

  <!-- Card 3: Subject & Notes -->
  <div class="mt-6 glass-card p-6 space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Subject & Notes</h2>
      {#if isFrontSynced}
        <span class="glass-badge badge-blue">
          Synced from Front
        </span>
      {/if}
    </div>

    <div>
      <label for="subject" class="block text-sm font-medium text-text-secondary">Subject</label>
      <input
        id="subject"
        type="text"
        bind:value={subject}
        oninput={() => { if (!isFrontSynced) triggerSave(); }}
        disabled={isFrontSynced}
        class="glass-input mt-1 block w-full {isFrontSynced ? 'opacity-50 cursor-not-allowed' : ''}"
        placeholder="Activity subject"
      />
    </div>

    <div>
      <label for="notes" class="block text-sm font-medium text-text-secondary">Notes</label>
      <textarea
        id="notes"
        bind:value={notes}
        oninput={() => { if (!isFrontSynced) triggerSave(); }}
        disabled={isFrontSynced}
        rows={8}
        class="glass-input mt-1 block w-full max-h-[32rem] overflow-y-auto {isFrontSynced ? 'opacity-50 cursor-not-allowed resize-none' : 'resize-y'}"
        placeholder="Optional notes..."
      ></textarea>
    </div>
  </div>

  <!-- Card 4: Opportunities -->
  <div class="mt-6">
    <RelatedListTable
      title="Opportunities"
      items={activity.linkedOpportunities ?? []}
      columns={[
        { key: "displayId", label: "Display ID", sortable: true, sortValue: (e) => (e as unknown as LinkedOpportunity).displayId },
        { key: "stage", label: "Stage", sortable: true, sortValue: (e) => (e as unknown as LinkedOpportunity).stage },
        { key: "linked", label: "Linked", sortable: true, sortValue: (e) => (e as unknown as LinkedOpportunity).createdAt },
        { key: "unlink", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="linked"
      defaultSortDirection="desc"
      searchFilter={(e, q) => {
        const opp = e as unknown as LinkedOpportunity;
        return opp.displayId.toLowerCase().includes(q) ||
          (opportunityStageLabels[opp.stage] ?? opp.stage).toLowerCase().includes(q);
      }}
      emptyMessage="No linked opportunities yet."
      searchEmptyMessage="No opportunities match your search."
      addLabel="Opportunity"
    >
      {#snippet row(item, _searchQuery)}
        {@const opp = item as unknown as LinkedOpportunity}
        <td class="whitespace-nowrap">
          <a href={resolve(`/opportunities/${opp.opportunityId}?from=${$page.url.pathname}`)} class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">
            {opp.displayId}
          </a>
        </td>
        <td>
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <span class="glass-badge {opportunityStageColors[opp.stage] ?? 'bg-glass text-text-secondary'}">
            <!-- eslint-disable-next-line security/detect-object-injection -->
            {opportunityStageLabels[opp.stage] ?? opp.stage}
          </span>
        </td>
        <td class="text-sm text-text-muted whitespace-nowrap">{formatRelativeTime(opp.createdAt)}</td>
        <td>
          <form method="POST" action="?/unlinkOpportunity">
            <input type="hidden" name="linkId" value={opp.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Unlink opportunity">
              <Unlink size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/linkOpportunity" class="space-y-3">
          <SearchableSelect
            options={opportunityOptions}
            name="opportunityId"
            id="linkOpportunityId"
            value=""
            placeholder="Search opportunities..."
          />
          <Button type="submit" size="sm">
            Link Opportunity
          </Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Geo-Interest Expressions -->
  <div class="mt-6">
    <RelatedListTable
      title="Geo-Interest Expressions"
      items={activity.geoInterestExpressions}
      columns={[
        { key: "location", label: "Location", sortable: true, sortValue: (e) => `${(e as unknown as GeoInterestExpression).city ?? ""}, ${(e as unknown as GeoInterestExpression).country ?? ""}` },
        { key: "notes", label: "Notes", sortable: true, sortValue: (e) => (e as unknown as GeoInterestExpression).notes ?? "" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="location"
      defaultSortDirection="asc"
      searchFilter={(e, q) => {
        const expr = e as unknown as GeoInterestExpression;
        return (expr.city ?? "").toLowerCase().includes(q) ||
          (expr.country ?? "").toLowerCase().includes(q) ||
          (expr.notes ?? "").toLowerCase().includes(q);
      }}
      emptyMessage="No geo-interest expressions yet."
      searchEmptyMessage="No geo-interest expressions match your search."
      addLabel="Geo-Interest"
    >
      {#snippet row(item, _searchQuery)}
        {@const expr = item as unknown as GeoInterestExpression}
        <td>
          <a href={resolve(`/geo-interests/${expr.geoInterestId}?from=${$page.url.pathname}`)} class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">
            {expr.city ?? "—"}, {expr.country ?? "—"}
          </a>
        </td>
        <td class="text-sm text-text-secondary">{expr.notes ?? "—"}</td>
        <td>
          <form method="POST" action="?/deleteGeoInterestExpression">
            <input type="hidden" name="id" value={expr.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete expression">
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
        { key: "route", label: "Route", sortable: true, sortValue: (e) => `${(e as unknown as RouteInterestExpression).originCity ?? ""} ${(e as unknown as RouteInterestExpression).destinationCity ?? ""}` },
        { key: "frequency", label: "Frequency", sortable: true, sortValue: (e) => (e as unknown as RouteInterestExpression).frequency },
        { key: "notes", label: "Notes", sortable: true, sortValue: (e) => (e as unknown as RouteInterestExpression).notes ?? "" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="route"
      defaultSortDirection="asc"
      searchFilter={(e, q) => {
        const expr = e as unknown as RouteInterestExpression;
        return (expr.originCity ?? "").toLowerCase().includes(q) ||
          (expr.originCountry ?? "").toLowerCase().includes(q) ||
          (expr.destinationCity ?? "").toLowerCase().includes(q) ||
          (expr.destinationCountry ?? "").toLowerCase().includes(q) ||
          expr.frequency.toLowerCase().includes(q) ||
          (expr.notes ?? "").toLowerCase().includes(q);
      }}
      emptyMessage="No route-interest expressions yet."
      searchEmptyMessage="No route-interest expressions match your search."
      addLabel="Route-Interest"
    >
      {#snippet row(item, _searchQuery)}
        {@const expr = item as unknown as RouteInterestExpression}
        <td>
          <a href={resolve(`/route-interests/${expr.routeInterestId}?from=${$page.url.pathname}`)} class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">
            {expr.originCity ?? "—"}, {expr.originCountry ?? "—"} &rarr; {expr.destinationCity ?? "—"}, {expr.destinationCountry ?? "—"}
          </a>
        </td>
        <td class="text-sm text-text-secondary">{expr.frequency === "repeat" ? "Repeat" : "One-time"}</td>
        <td class="text-sm text-text-secondary">{expr.notes ?? "—"}</td>
        <td>
          <form method="POST" action="?/deleteRouteInterestExpression">
            <input type="hidden" name="id" value={expr.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete expression">
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
          <span class="glass-badge bg-glass text-text-secondary">
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
  message="Are you sure you want to delete this activity?"
  onConfirm={() => { deleteFormEl?.requestSubmit(); showDeleteConfirm = false; }}
  onCancel={() => { showDeleteConfirm = false; }}
/>
