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
  };

  const socialId = $derived(data.socialId as SocialId);
  const platformConfigs = $derived(data.platformConfigs as ConfigItem[]);
  const allHumans = $derived(data.allHumans as HumanListItem[]);
  const allAccounts = $derived(data.allAccounts as AccountListItem[]);

  // Auto-save state
  let handle = $state("");
  let platformId = $state("");
  let humanId = $state("");
  let accountId = $state("");
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);

  // Initialize state from data
  $effect(() => {
    handle = socialId.handle;
    platformId = socialId.platformId ?? "";
    humanId = socialId.humanId ?? "";
    accountId = socialId.accountId ?? "";
    if (!initialized) initialized = true;
  });

  const platformOptions = $derived(
    platformConfigs.map((p) => ({ value: p.id, label: p.name }))
  );

  const humanOptions = $derived(
    allHumans.map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName} (${h.displayId})` }))
  );

  const accountOptions = $derived(
    allAccounts.map((a) => ({ value: a.id, label: `${a.name} (${a.displayId})` }))
  );

  const autoSaver = createAutoSaver({
    endpoint: `/api/social-ids/${socialId.id}`,
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
      handle,
      platformId: platformId || null,
      humanId: humanId || null,
      accountId: accountId || null,
    });
  }

  function triggerSaveImmediate() {
    if (!initialized) return;
    autoSaver.saveImmediate({
      handle,
      platformId: platformId || null,
      humanId: humanId || null,
      accountId: accountId || null,
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
</script>

<svelte:head>
  <title>{socialId.displayId} — {socialId.handle} - Humans CRM</title>
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
        <a href="/humans/{humanId}" class="mt-1 inline-block text-sm text-accent hover:text-cyan-300">
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
        <a href="/accounts/{accountId}" class="mt-1 inline-block text-sm text-accent hover:text-cyan-300">
          View Account
        </a>
      {/if}
    </div>
  </div>
</div>
