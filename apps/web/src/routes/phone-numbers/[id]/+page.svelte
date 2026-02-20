<script lang="ts">
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import { toast } from "svelte-sonner";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { onDestroy } from "svelte";

  let { data }: { data: PageData } = $props();

  type ConfigItem = { id: string; name: string };
  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type AccountListItem = { id: string; name: string; displayId: string };
  type Phone = {
    id: string;
    displayId: string;
    ownerType: string;
    ownerId: string;
    phoneNumber: string;
    labelId: string | null;
    labelName: string | null;
    hasWhatsapp: boolean;
    isPrimary: boolean;
    ownerName: string | null;
    ownerDisplayId: string | null;
  };

  const phone = $derived(data.phone as Phone);
  const humanPhoneLabelConfigs = $derived(data.humanPhoneLabelConfigs as ConfigItem[]);
  const accountPhoneLabelConfigs = $derived(data.accountPhoneLabelConfigs as ConfigItem[]);
  const allHumans = $derived(data.allHumans as HumanListItem[]);
  const allAccounts = $derived(data.allAccounts as AccountListItem[]);

  // Auto-save state
  let phoneNumber = $state("");
  let labelId = $state("");
  let ownerType = $state("human");
  let ownerId = $state("");
  let hasWhatsapp = $state(false);
  let isPrimary = $state(false);
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);

  // Initialize state from data
  $effect(() => {
    phoneNumber = phone.phoneNumber;
    labelId = phone.labelId ?? "";
    ownerType = phone.ownerType;
    ownerId = phone.ownerId;
    hasWhatsapp = phone.hasWhatsapp;
    isPrimary = phone.isPrimary;
    if (!initialized) initialized = true;
  });

  // Label options based on current owner type
  const phoneLabelOptions = $derived(
    (ownerType === "account" ? accountPhoneLabelConfigs : humanPhoneLabelConfigs)
      .map((l) => ({ value: l.id, label: l.name }))
  );

  // Owner options: humans and accounts grouped
  const ownerOptions = $derived([
    ...allHumans.map((h) => ({ value: `human:${h.id}`, label: `${h.firstName} ${h.lastName} (${h.displayId})` })),
    ...allAccounts.map((a) => ({ value: `account:${a.id}`, label: `${a.name} (${a.displayId})` })),
  ]);

  const selectedOwnerValue = $derived(`${ownerType}:${ownerId}`);

  const ownerHref = $derived(
    ownerType === "human" ? `/humans/${ownerId}` : `/accounts/${ownerId}`
  );

  const autoSaver = createAutoSaver({
    endpoint: `/api/phone-numbers/${phone.id}`,
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
    autoSaver.save({
      phoneNumber,
      labelId: labelId || null,
      ownerType,
      ownerId,
      hasWhatsapp,
      isPrimary,
    });
  }

  function triggerSaveImmediate() {
    if (!initialized) return;
    autoSaver.saveImmediate({
      phoneNumber,
      labelId: labelId || null,
      ownerType,
      ownerId,
      hasWhatsapp,
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
  <title>{phone.displayId} — {phone.phoneNumber} - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/phone-numbers"
    backLabel="Phone Numbers"
    title="{phone.displayId} — {phone.phoneNumber}"
  />

  <div class="glass-card p-6 space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Details</h2>
      <SaveIndicator status={saveStatus} />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="phoneNumber" class="block text-sm font-medium text-text-secondary">Phone Number</label>
        <input
          id="phoneNumber" type="text"
          bind:value={phoneNumber}
          oninput={triggerSave}
          class="glass-input mt-1 block w-full"
        />
      </div>
      <div>
        <label for="phoneLabel" class="block text-sm font-medium text-text-secondary">Label</label>
        <SearchableSelect
          options={phoneLabelOptions}
          name="labelId"
          id="phoneLabel"
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
      {#if phone.ownerName}
        <a href={ownerHref} class="mt-1 inline-block text-sm text-accent hover:text-cyan-300">
          View {phone.ownerName}
        </a>
      {/if}
    </div>

    <div class="flex gap-4">
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          bind:checked={hasWhatsapp}
          onchange={triggerSaveImmediate}
          class="rounded border-glass-border"
        />
        WhatsApp
      </label>
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
</div>
