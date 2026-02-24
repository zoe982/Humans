<script lang="ts">
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import { toast } from "svelte-sonner";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { onDestroy } from "svelte";
  import { resolve } from "$app/paths";

  let { data }: { data: PageData } = $props();

  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type AccountListItem = { id: string; name: string; displayId: string };
  type LinkedFlight = {
    id: string;
    crmDisplayId: string | null;
    originCity: string | null;
    destinationCity: string | null;
    flightDate: string | null;
  };
  type DiscountCode = {
    id: string;
    crmDisplayId: string | null;
    code: string;
    description: string | null;
    percentOff: number;
    isActive: boolean;
    maxUses: number | null;
    timesUsed: number;
    expiresAt: string | null;
    createdAt: string;
    humanId: string | null;
    humanName: string | null;
    accountId: string | null;
    accountName: string | null;
    linkedFlights: LinkedFlight[];
  };

  const discountCode = $derived(data.discountCode as DiscountCode);
  const allHumans = $derived(data.allHumans as HumanListItem[]);
  const allAccounts = $derived(data.allAccounts as AccountListItem[]);

  // Auto-save state (only human/account links are editable)
  let humanId = $state("");
  let accountId = $state("");
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);

  // Initialize state from data
  $effect(() => {
    humanId = discountCode.humanId ?? "";
    accountId = discountCode.accountId ?? "";
    if (!initialized) initialized = true;
  });

  const humanOptions = $derived(
    allHumans.map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName} (${h.displayId})` }))
  );

  const accountOptions = $derived(
    allAccounts.map((a) => ({ value: a.id, label: `${a.name} (${a.displayId})` }))
  );

  const autoSaver = createAutoSaver({
    endpoint: `/api/discount-codes/${discountCode.id}`,
    onStatusChange: (s) => { saveStatus = s; },
    onSaved: () => { toast("Changes saved"); },
    onError: (err) => { toast(`Save failed: ${err}`); },
  });

  onDestroy(() => autoSaver.destroy());

  function buildPayload() {
    return {
      humanId: humanId || null,
      accountId: accountId || null,
    };
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
</script>

<svelte:head>
  <title>{discountCode.crmDisplayId ?? "Discount Code"} — {discountCode.code} - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/discount-codes"
    backLabel="Discount Codes"
    title="{discountCode.crmDisplayId ?? 'Discount Code'} — {discountCode.code}"
  />

  <!-- Read-only Details -->
  <div class="glass-card p-6 space-y-6">
    <h2 class="text-lg font-semibold text-text-primary">Details</h2>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label class="block text-sm font-medium text-text-secondary">Code</label>
        <div class="mt-1 px-3 py-2 text-sm font-mono text-text-primary bg-glass/50 rounded-lg">{discountCode.code}</div>
      </div>
      <div>
        <label class="block text-sm font-medium text-text-secondary">% Off</label>
        <div class="mt-1 px-3 py-2 text-sm text-text-primary bg-glass/50 rounded-lg">{discountCode.percentOff}%</div>
      </div>
      <div>
        <label class="block text-sm font-medium text-text-secondary">Active</label>
        <div class="mt-1">
          {#if discountCode.isActive}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium badge-green">Active</span>
          {:else}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-muted">Inactive</span>
          {/if}
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-text-secondary">Max Uses</label>
        <div class="mt-1 px-3 py-2 text-sm text-text-primary bg-glass/50 rounded-lg">{discountCode.maxUses ?? "\u2014"}</div>
      </div>
      <div>
        <label class="block text-sm font-medium text-text-secondary">Times Used</label>
        <div class="mt-1 px-3 py-2 text-sm text-text-primary bg-glass/50 rounded-lg">{discountCode.timesUsed}</div>
      </div>
      <div>
        <label class="block text-sm font-medium text-text-secondary">Expires At</label>
        <div class="mt-1 px-3 py-2 text-sm text-text-primary bg-glass/50 rounded-lg">
          {discountCode.expiresAt ? new Date(discountCode.expiresAt).toLocaleDateString() : "\u2014"}
        </div>
      </div>
    </div>

    {#if discountCode.description}
      <div>
        <label class="block text-sm font-medium text-text-secondary">Description</label>
        <div class="mt-1 px-3 py-2 text-sm text-text-primary bg-glass/50 rounded-lg">{discountCode.description}</div>
      </div>
    {/if}
  </div>

  <!-- Editable Links -->
  <div class="mt-6 glass-card p-6 space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Links</h2>
      <SaveIndicator status={saveStatus} />
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
        <a href={resolve(`/humans/${humanId}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">
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
        <a href={resolve(`/accounts/${accountId}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">
          View Account
        </a>
      {/if}
    </div>
  </div>

  <!-- Linked Flights -->
  <div class="mt-6">
    <RelatedListTable
      title="Linked Flights"
      items={discountCode.linkedFlights}
      columns={[
        { key: "id", label: "Flight ID" },
        { key: "route", label: "Route" },
        { key: "date", label: "Date" },
      ]}
      emptyMessage="No flights linked to this discount code."
    >
      {#snippet row(flight, _searchQuery)}
        <td class="font-mono text-sm">
          <a href={resolve(`/flights/${flight.id}`)} class="text-accent hover:text-[var(--link-hover)]">{flight.crmDisplayId ?? flight.id}</a>
        </td>
        <td class="text-sm text-text-secondary">
          {flight.originCity ?? "?"} &rarr; {flight.destinationCity ?? "?"}
        </td>
        <td class="text-sm text-text-secondary">
          {flight.flightDate ? new Date(flight.flightDate + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "\u2014"}
        </td>
      {/snippet}
    </RelatedListTable>
  </div>
</div>
