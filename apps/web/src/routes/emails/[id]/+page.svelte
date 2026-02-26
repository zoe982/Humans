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

  let { data }: { data: PageData } = $props();

  type ConfigItem = { id: string; name: string };
  type Email = {
    id: string;
    displayId: string;
    humanId: string | null;
    accountId: string | null;
    generalLeadId: string | null;
    websiteBookingRequestId: string | null;
    routeSignupId: string | null;
    email: string;
    labelId: string | null;
    labelName: string | null;
    isPrimary: boolean;
    ownerName: string | null;
    ownerDisplayId: string | null;
    humanDisplayId: string | null;
    humanName: string | null;
    accountDisplayId: string | null;
    accountName: string | null;
    generalLeadDisplayId: string | null;
    generalLeadName: string | null;
    websiteBookingRequestDisplayId: string | null;
    websiteBookingRequestName: string | null;
    routeSignupDisplayId: string | null;
    routeSignupName: string | null;
  };

  const email = $derived(data.email as Email);
  const humanEmailLabelConfigs = $derived(data.humanEmailLabelConfigs as ConfigItem[]);
  const accountEmailLabelConfigs = $derived(data.accountEmailLabelConfigs as ConfigItem[]);

  // Auto-save state
  let emailAddress = $state("");
  let labelId = $state("");
  let isPrimary = $state(false);
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);

  let autoSaver: ReturnType<typeof createAutoSaver>;

  function initServices() {
    const _history = createChangeHistoryLoader("email", email.id);
    autoSaver = createAutoSaver({
      endpoint: `/api/emails/${email.id}`,
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
    emailAddress = email.email;
    labelId = email.labelId ?? "";
    isPrimary = email.isPrimary;
    if (!initialized) initialized = true;
  });

  // Label options based on current owner type
  const emailLabelOptions = $derived(
    (email.accountId != null && email.humanId == null ? accountEmailLabelConfigs : humanEmailLabelConfigs)
      .map((l) => ({ value: l.id, label: l.name }))
  );

  // Relationships
  type Relationship = { href: string; displayId: string; name: string | null };

  const relationships: Relationship[] = $derived.by(() => {
    const rels: Relationship[] = [];
    const e = email;
    if (e.humanId && e.humanDisplayId)
      rels.push({ href: resolve(`/humans/${e.humanId}`), displayId: e.humanDisplayId, name: e.humanName });
    if (e.accountId && e.accountDisplayId)
      rels.push({ href: resolve(`/accounts/${e.accountId}`), displayId: e.accountDisplayId, name: e.accountName });
    if (e.generalLeadId && e.generalLeadDisplayId)
      rels.push({ href: resolve(`/leads/general-leads/${e.generalLeadId}`), displayId: e.generalLeadDisplayId, name: e.generalLeadName });
    if (e.websiteBookingRequestId && e.websiteBookingRequestDisplayId)
      rels.push({ href: resolve(`/leads/website-booking-requests/${e.websiteBookingRequestId}`), displayId: e.websiteBookingRequestDisplayId, name: e.websiteBookingRequestName });
    if (e.routeSignupId && e.routeSignupDisplayId)
      rels.push({ href: resolve(`/leads/route-signups/${e.routeSignupId}`), displayId: e.routeSignupDisplayId, name: e.routeSignupName });
    return rels;
  });

  onDestroy(() => autoSaver.destroy());

  function triggerSave() {
    if (!initialized) return;
    autoSaver.save({
      email: emailAddress,
      labelId: labelId || null,
      isPrimary,
    });
  }

  function triggerSaveImmediate() {
    if (!initialized) return;
    autoSaver.saveImmediate({
      email: emailAddress,
      labelId: labelId || null,
      isPrimary,
    });
  }

  function handleLabelChange(value: string) {
    labelId = value;
    triggerSaveImmediate();
  }
</script>

<svelte:head>
  <title>{email.displayId} — {email.email} - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/emails"
    backLabel="Emails"
    title="{email.displayId} — {email.email}"
  />

  <div class="glass-card p-6 space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Details</h2>
      <SaveIndicator status={saveStatus} />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="emailAddress" class="block text-sm font-medium text-text-secondary">Email Address</label>
        <input
          id="emailAddress" type="email"
          bind:value={emailAddress}
          oninput={triggerSave}
          class="glass-input mt-1 block w-full"
        />
      </div>
      <div>
        <label for="emailLabel" class="block text-sm font-medium text-text-secondary">Label</label>
        <SearchableSelect
          options={emailLabelOptions}
          name="labelId"
          id="emailLabel"
          value={labelId}
          emptyOption="None"
          placeholder="Select label..."
          onSelect={handleLabelChange}
        />
      </div>
    </div>

    <div>
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          bind:checked={isPrimary}
          onchange={triggerSaveImmediate}
          class="rounded border-glass-border"
        />
        Primary
      </label>
    </div>
  </div>

  {#if relationships.length > 0}
    <div class="glass-card p-6 mt-6">
      <h2 class="text-lg font-semibold text-text-primary">Relationships</h2>
      <div class="mt-4 space-y-2">
        {#each relationships as rel, i (i)}
          <div class="text-sm">
            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
            <a href={rel.href} class="text-accent hover:text-[var(--link-hover)] font-mono">{rel.displayId}</a>
            {#if rel.name}
              <span class="text-text-secondary ml-1">({rel.name})</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

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
