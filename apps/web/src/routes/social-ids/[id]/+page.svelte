<script lang="ts">
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import { toast } from "svelte-sonner";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { onDestroy } from "svelte";
  import { formatRelativeTime, summarizeChanges } from "$lib/utils/format";
  import { createChangeHistoryLoader } from "$lib/changeHistory.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/stores";

  let { data }: { data: PageData } = $props();

  type ConfigItem = { id: string; name: string };
  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type AccountListItem = { id: string; name: string; displayId: string };
  type GeneralLeadListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type BookingRequestListItem = { id: string; first_name: string | null; last_name: string | null; crm_display_id: string | null };
  type RouteSignupListItem = { id: string; first_name: string | null; last_name: string | null; display_id: string | null };
  type SocialId = {
    id: string;
    displayId: string;
    handle: string;
    platformId: string | null;
    platformName: string | null;
    humanId: string | null;
    humanName: string | null;
    accountId: string | null;
    accountName: string | null;
    generalLeadId: string | null;
    generalLeadName: string | null;
    websiteBookingRequestId: string | null;
    websiteBookingRequestName: string | null;
    routeSignupId: string | null;
    routeSignupName: string | null;
  };

  const socialId = $derived(data.socialId as SocialId);
  const platformConfigs = $derived(data.platformConfigs as ConfigItem[]);
  const allHumans = $derived(data.allHumans as HumanListItem[]);
  const allAccounts = $derived(data.allAccounts as AccountListItem[]);
  const allGeneralLeads = $derived(data.allGeneralLeads as GeneralLeadListItem[]);
  const allBookingRequests = $derived(data.allBookingRequests as BookingRequestListItem[]);
  const allRouteSignups = $derived(data.allRouteSignups as RouteSignupListItem[]);

  // Auto-save state
  let handle = $state("");
  let platformId = $state("");
  let humanId = $state("");
  let accountId = $state("");
  let generalLeadId = $state("");
  let websiteBookingRequestId = $state("");
  let routeSignupId = $state("");
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);

  // Change history and auto-saver
  let autoSaver: ReturnType<typeof createAutoSaver>;

  function initServices() {
    const _history = createChangeHistoryLoader("social_id", socialId.id);
    autoSaver = createAutoSaver({
      endpoint: `/api/social-ids/${socialId.id}`,
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
    handle = socialId.handle;
    platformId = socialId.platformId ?? "";
    humanId = socialId.humanId ?? "";
    accountId = socialId.accountId ?? "";
    generalLeadId = socialId.generalLeadId ?? "";
    websiteBookingRequestId = socialId.websiteBookingRequestId ?? "";
    routeSignupId = socialId.routeSignupId ?? "";
    if (!initialized) initialized = true;
  });

  const platformOptions = $derived(
    platformConfigs.map((p) => ({ value: p.id, label: p.name }))
  );

  const humanOptions = $derived(
    allHumans.map((h) => ({ value: h.id, label: `${h.displayId} ${h.firstName} ${h.lastName}` }))
  );

  const accountOptions = $derived(
    allAccounts.map((a) => ({ value: a.id, label: `${a.displayId} ${a.name}` }))
  );

  const generalLeadOptions = $derived(
    allGeneralLeads.map((l) => ({ value: l.id, label: `${l.displayId} ${l.firstName} ${l.lastName}` }))
  );

  const bookingRequestOptions = $derived(
    allBookingRequests.map((b) => ({ value: b.id, label: `${b.crm_display_id ?? ""} ${[b.first_name, b.last_name].filter(Boolean).join(" ")}`.trim() }))
  );

  const routeSignupOptions = $derived(
    allRouteSignups.map((r) => ({ value: r.id, label: `${r.display_id ?? ""} ${[r.first_name, r.last_name].filter(Boolean).join(" ")}`.trim() }))
  );

  onDestroy(() => autoSaver.destroy());

  function triggerSave() {
    if (!initialized) return;
    autoSaver.save({
      handle,
      platformId: platformId || null,
      humanId: humanId || null,
      accountId: accountId || null,
      generalLeadId: generalLeadId || null,
      websiteBookingRequestId: websiteBookingRequestId || null,
      routeSignupId: routeSignupId || null,
    });
  }

  function triggerSaveImmediate() {
    if (!initialized) return;
    autoSaver.saveImmediate({
      handle,
      platformId: platformId || null,
      humanId: humanId || null,
      accountId: accountId || null,
      generalLeadId: generalLeadId || null,
      websiteBookingRequestId: websiteBookingRequestId || null,
      routeSignupId: routeSignupId || null,
    });
  }

  function handlePlatformChange(value: string) {
    platformId = value;
    triggerSaveImmediate();
  }

  function handleHumanChange(value: string) {
    humanId = value;
    triggerSaveImmediate();
  }

  function handleAccountChange(value: string) {
    accountId = value;
    triggerSaveImmediate();
  }

  function handleGeneralLeadChange(value: string) {
    generalLeadId = value;
    triggerSaveImmediate();
  }

  function handleBookingRequestChange(value: string) {
    websiteBookingRequestId = value;
    triggerSaveImmediate();
  }

  function handleRouteSignupChange(value: string) {
    routeSignupId = value;
    triggerSaveImmediate();
  }
</script>

<svelte:head>
  <title>{socialId.displayId} — {socialId.handle} - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/social-ids"
    backLabel="Social Media IDs"
    title="{socialId.displayId} — {socialId.handle}"
  />

  <div class="glass-card p-6 space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Details</h2>
      <SaveIndicator status={saveStatus} />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="handle" class="block text-sm font-medium text-text-secondary">Handle</label>
        <input
          id="handle" type="text"
          bind:value={handle}
          oninput={triggerSave}
          class="glass-input mt-1 block w-full"
        />
      </div>
      <div>
        <label for="platform" class="block text-sm font-medium text-text-secondary">Platform</label>
        <SearchableSelect
          options={platformOptions}
          name="platformId"
          id="platform"
          value={platformId}
          emptyOption="None"
          placeholder="Select platform..."
          onSelect={handlePlatformChange}
        />
      </div>
    </div>

    <div>
      <label for="human" class="block text-sm font-medium text-text-secondary">Human</label>
      <SearchableSelect
        options={humanOptions}
        name="humanId"
        id="human"
        value={humanId}
        emptyOption="None"
        placeholder="Search humans..."
        onSelect={handleHumanChange}
      />
      {#if humanId}
        <a href={resolve(`/humans/${humanId}?from=${$page.url.pathname}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">
          View Human
        </a>
      {/if}
    </div>

    <div>
      <label for="account" class="block text-sm font-medium text-text-secondary">Account</label>
      <SearchableSelect
        options={accountOptions}
        name="accountId"
        id="account"
        value={accountId}
        emptyOption="None"
        placeholder="Search accounts..."
        onSelect={handleAccountChange}
      />
      {#if accountId}
        <a href={resolve(`/accounts/${accountId}?from=${$page.url.pathname}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">
          View Account
        </a>
      {/if}
    </div>

    <div>
      <label for="generalLead" class="block text-sm font-medium text-text-secondary">General Lead</label>
      <SearchableSelect
        options={generalLeadOptions}
        name="generalLeadId"
        id="generalLead"
        value={generalLeadId}
        emptyOption="None"
        placeholder="Search general leads..."
        onSelect={handleGeneralLeadChange}
      />
      {#if generalLeadId}
        <a href={resolve(`/leads/general-leads/${generalLeadId}?from=${$page.url.pathname}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">
          View General Lead
        </a>
      {/if}
    </div>

    <div>
      <label for="bookingRequest" class="block text-sm font-medium text-text-secondary">Booking Request</label>
      <SearchableSelect
        options={bookingRequestOptions}
        name="websiteBookingRequestId"
        id="bookingRequest"
        value={websiteBookingRequestId}
        emptyOption="None"
        placeholder="Search booking requests..."
        onSelect={handleBookingRequestChange}
      />
      {#if websiteBookingRequestId}
        <a href={resolve(`/leads/website-booking-requests/${websiteBookingRequestId}?from=${$page.url.pathname}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">
          View Booking Request
        </a>
      {/if}
    </div>

    <div>
      <label for="routeSignup" class="block text-sm font-medium text-text-secondary">Route Signup</label>
      <SearchableSelect
        options={routeSignupOptions}
        name="routeSignupId"
        id="routeSignup"
        value={routeSignupId}
        emptyOption="None"
        placeholder="Search route signups..."
        onSelect={handleRouteSignupChange}
      />
      {#if routeSignupId}
        <a href={resolve(`/leads/route-signups/${routeSignupId}?from=${$page.url.pathname}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">
          View Route Signup
        </a>
      {/if}
    </div>
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
