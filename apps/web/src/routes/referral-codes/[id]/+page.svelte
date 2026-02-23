<script lang="ts">
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import { toast } from "svelte-sonner";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { onDestroy } from "svelte";
  import { formatRelativeTime, summarizeChanges } from "$lib/utils/format";
  import { createChangeHistoryLoader } from "$lib/changeHistory";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";

  let { data }: { data: PageData } = $props();

  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type AccountListItem = { id: string; name: string; displayId: string };
  type ReferralCode = {
    id: string;
    displayId: string;
    code: string;
    description: string | null;
    isActive: boolean;
    humanId: string | null;
    humanName: string | null;
    accountId: string | null;
    accountName: string | null;
  };

  const referralCode = $derived(data.referralCode as ReferralCode);
  const allHumans = $derived(data.allHumans as HumanListItem[]);
  const allAccounts = $derived(data.allAccounts as AccountListItem[]);

  // Auto-save state
  let code = $state("");
  let description = $state("");
  let isActive = $state(true);
  let humanId = $state("");
  let accountId = $state("");
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);

  // Change history
  const history = createChangeHistoryLoader("referral_code", referralCode.id);

  $effect(() => {
    if (!history.historyLoaded) {
      void history.loadHistory();
    }
  });

  // Initialize state from data
  $effect(() => {
    code = referralCode.code;
    description = referralCode.description ?? "";
    isActive = referralCode.isActive;
    humanId = referralCode.humanId ?? "";
    accountId = referralCode.accountId ?? "";
    if (!initialized) initialized = true;
  });

  const humanOptions = $derived(
    allHumans.map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName} (${h.displayId})` }))
  );

  const accountOptions = $derived(
    allAccounts.map((a) => ({ value: a.id, label: `${a.name} (${a.displayId})` }))
  );

  const autoSaver = createAutoSaver({
    endpoint: `/api/referral-codes/${referralCode.id}`,
    onStatusChange: (s) => { saveStatus = s; },
    onSaved: () => {
      toast("Changes saved");
      history.resetHistory();
    },
    onError: (err) => {
      toast(`Save failed: ${err}`);
    },
  });

  onDestroy(() => autoSaver.destroy());

  function buildPayload() {
    return {
      code,
      description: description || null,
      isActive,
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

  function handleHumanChange(value: string) {
    humanId = value;
    triggerSaveImmediate();
  }

  function handleAccountChange(value: string) {
    accountId = value;
    triggerSaveImmediate();
  }

  function handleActiveToggle() {
    isActive = !isActive;
    triggerSaveImmediate();
  }
</script>

<svelte:head>
  <title>{referralCode.displayId} — {referralCode.code} - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/referral-codes"
    backLabel="Referral Codes"
    title="{referralCode.displayId} — {referralCode.code}"
  />

  <div class="glass-card p-6 space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Details</h2>
      <SaveIndicator status={saveStatus} />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="code" class="block text-sm font-medium text-text-secondary">Code</label>
        <input
          id="code" type="text"
          bind:value={code}
          oninput={triggerSave}
          class="glass-input mt-1 block w-full"
        />
      </div>
      <div>
        <label for="active" class="block text-sm font-medium text-text-secondary">Active</label>
        <button
          id="active"
          type="button"
          onclick={handleActiveToggle}
          class="mt-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors {isActive ? 'badge-green ring-1 ring-[var(--badge-green-text)]/30' : 'bg-glass text-text-muted'}"
        >
          {isActive ? "Active" : "Inactive"}
        </button>
      </div>
    </div>

    <div>
      <label for="description" class="block text-sm font-medium text-text-secondary">Description</label>
      <textarea
        id="description" rows="2"
        bind:value={description}
        oninput={triggerSave}
        class="glass-input mt-1 block w-full"
        placeholder="Optional description..."
      ></textarea>
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
        <a href="/humans/{humanId}" class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">
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
        <a href="/accounts/{accountId}" class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">
          View Account
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
