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

  type ConfigItem = { id: string; name: string };
  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type AccountListItem = { id: string; name: string; displayId: string };
  type Email = {
    id: string;
    displayId: string;
    ownerType: string;
    ownerId: string;
    email: string;
    labelId: string | null;
    labelName: string | null;
    isPrimary: boolean;
    ownerName: string | null;
    ownerDisplayId: string | null;
  };

  const email = $derived(data.email as Email);
  const humanEmailLabelConfigs = $derived(data.humanEmailLabelConfigs as ConfigItem[]);
  const accountEmailLabelConfigs = $derived(data.accountEmailLabelConfigs as ConfigItem[]);
  const allHumans = $derived(data.allHumans as HumanListItem[]);
  const allAccounts = $derived(data.allAccounts as AccountListItem[]);

  // Auto-save state
  let emailAddress = $state("");
  let labelId = $state("");
  let ownerType = $state("human");
  let ownerId = $state("");
  let isPrimary = $state(false);
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);

  // Change history
  const history = createChangeHistoryLoader("email", email.id);

  $effect(() => {
    if (!history.historyLoaded) {
      void history.loadHistory();
    }
  });

  // Initialize state from data
  $effect(() => {
    emailAddress = email.email;
    labelId = email.labelId ?? "";
    ownerType = email.ownerType;
    ownerId = email.ownerId;
    isPrimary = email.isPrimary;
    if (!initialized) initialized = true;
  });

  // Label options based on current owner type
  const emailLabelOptions = $derived(
    (ownerType === "account" ? accountEmailLabelConfigs : humanEmailLabelConfigs)
      .map((l) => ({ value: l.id, label: l.name }))
  );

  // Owner options: humans and accounts
  const ownerOptions = $derived([
    ...allHumans.map((h) => ({ value: `human:${h.id}`, label: `${h.firstName} ${h.lastName} (${h.displayId})` })),
    ...allAccounts.map((a) => ({ value: `account:${a.id}`, label: `${a.name} (${a.displayId})` })),
  ]);

  const selectedOwnerValue = $derived(`${ownerType}:${ownerId}`);

  const ownerHref = $derived(
    ownerType === "human" ? `/humans/${ownerId}` : `/accounts/${ownerId}`
  );

  const autoSaver = createAutoSaver({
    endpoint: `/api/emails/${email.id}`,
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

  function triggerSave() {
    if (!initialized) return;
    autoSaver.save({
      email: emailAddress,
      labelId: labelId || null,
      ownerType,
      ownerId,
      isPrimary,
    });
  }

  function triggerSaveImmediate() {
    if (!initialized) return;
    autoSaver.saveImmediate({
      email: emailAddress,
      labelId: labelId || null,
      ownerType,
      ownerId,
      isPrimary,
    });
  }

  function handleOwnerChange(value: string) {
    const [type, id] = value.split(":");
    if (type && id) {
      const prevOwnerType = ownerType;
      ownerType = type;
      ownerId = id;
      // Reset label when owner type changes since label configs differ
      if (type !== prevOwnerType) {
        labelId = "";
      }
      triggerSaveImmediate();
    }
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
      <label for="owner" class="block text-sm font-medium text-text-secondary">Owner</label>
      <SearchableSelect
        options={ownerOptions}
        name="owner"
        id="owner"
        value={selectedOwnerValue}
        placeholder="Search owners..."
        onSelect={handleOwnerChange}
      />
      {#if email.ownerName}
        <a href={ownerHref} class="mt-1 inline-block text-sm text-accent hover:text-cyan-300">
          View {email.ownerName}
        </a>
      {/if}
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

  <!-- Change History -->
  <div class="mt-6">
    <RelatedListTable
      title="Change History"
      items={history.historyEntries}
      columns={[
        { key: "colleague", label: "Colleague" },
        { key: "action", label: "Action" },
        { key: "time", label: "Time" },
        { key: "changes", label: "Changes" },
      ]}
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
