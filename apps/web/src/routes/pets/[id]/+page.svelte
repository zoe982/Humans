<script lang="ts">
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import { toast } from "svelte-sonner";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { PET_BREEDS } from "@humans/shared/constants";
  import { onDestroy } from "svelte";
  import { formatRelativeTime, summarizeChanges } from "$lib/utils/format";
  import { createChangeHistoryLoader } from "$lib/changeHistory";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";

  let { data }: { data: PageData } = $props();

  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type Pet = {
    id: string;
    displayId: string;
    humanId: string | null;
    type: string;
    name: string;
    breed: string | null;
    weight: number | null;
    ownerName: string | null;
    ownerDisplayId: string | null;
  };

  const pet = $derived(data.pet as Pet);
  const allHumans = $derived(data.allHumans as HumanListItem[]);

  // Auto-save state
  let petName = $state("");
  let petType = $state("dog");
  let petBreed = $state("");
  let petWeight = $state("");
  let ownerId = $state("");
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);
  let breedDropdownOpen = $state(false);

  // Change history
  const history = createChangeHistoryLoader("pet", pet.id);

  $effect(() => {
    if (!history.historyLoaded) {
      void history.loadHistory();
    }
  });

  // Initialize state from data
  $effect(() => {
    petName = pet.name;
    petType = pet.type;
    petBreed = pet.breed ?? "";
    petWeight = pet.weight != null ? String(pet.weight) : "";
    ownerId = pet.humanId ?? "";
    if (!initialized) initialized = true;
  });

  const humanOptions = $derived(
    allHumans.map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName} (${h.displayId})` }))
  );

  const autoSaver = createAutoSaver({
    endpoint: `/api/pets/${pet.id}`,
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
    const payload: Record<string, unknown> = {
      name: petName,
      type: petType,
      breed: petType === "dog" && petBreed ? petBreed : null,
      weight: petWeight ? parseFloat(petWeight) : null,
      humanId: ownerId || undefined,
    };
    return payload;
  }

  function triggerSave() {
    if (!initialized) return;
    autoSaver.save(buildPayload());
  }

  function triggerSaveImmediate() {
    if (!initialized) return;
    autoSaver.saveImmediate(buildPayload());
  }

  function handleTypeChange(type: string) {
    petType = type;
    if (type === "cat") {
      petBreed = "";
    }
    triggerSaveImmediate();
  }

  function handleOwnerChange(value: string) {
    ownerId = value;
    triggerSaveImmediate();
  }

  function handleBreedChange(value: string) {
    petBreed = value;
    triggerSaveImmediate();
  }
</script>

<svelte:head>
  <title>{pet.displayId} — {pet.name} - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/pets"
    backLabel="Pets"
    title="{pet.displayId} — {pet.name}"
  />

  <div class="glass-card p-6 space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Details</h2>
      <SaveIndicator status={saveStatus} />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="petName" class="block text-sm font-medium text-text-secondary">Name</label>
        <input
          id="petName" type="text"
          bind:value={petName}
          oninput={triggerSave}
          class="glass-input mt-1 block w-full"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-text-secondary mb-2">Type</label>
        <div class="flex gap-2">
          <button
            type="button"
            onclick={() => handleTypeChange("dog")}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {petType === 'dog' ? 'badge-blue ring-1 ring-[var(--badge-blue-text)]/30' : 'bg-glass text-text-secondary hover:bg-glass-hover'}"
          >
            Dog
          </button>
          <button
            type="button"
            onclick={() => handleTypeChange("cat")}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {petType === 'cat' ? 'badge-purple ring-1 ring-[var(--badge-purple-text)]/30' : 'bg-glass text-text-secondary hover:bg-glass-hover'}"
          >
            Cat
          </button>
        </div>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      {#if petType === "dog"}
        <div class={breedDropdownOpen ? "relative z-10" : ""}>
          <label for="petBreed" class="block text-sm font-medium text-text-secondary">Breed</label>
          <SearchableSelect
            options={PET_BREEDS}
            name="breed"
            id="petBreed"
            value={petBreed}
            placeholder="Search breeds..."
            emptyOption="None"
            onSelect={handleBreedChange}
            onOpenChange={(isOpen) => { breedDropdownOpen = isOpen; }}
          />
        </div>
      {/if}
      <div class={petType === "dog" ? "" : "sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]"}>
        <label for="petWeight" class="block text-sm font-medium text-text-secondary">Weight (kg)</label>
        <input
          id="petWeight" type="number" step="0.1" min="0"
          bind:value={petWeight}
          oninput={triggerSave}
          class="glass-input mt-1 block w-full"
        />
      </div>
    </div>

    <div>
      <label for="owner" class="block text-sm font-medium text-text-secondary">Owner</label>
      <SearchableSelect
        options={humanOptions}
        name="owner"
        id="owner"
        value={ownerId}
        placeholder="Search owners..."
        emptyOption="None"
        onSelect={handleOwnerChange}
      />
      {#if pet.humanId && pet.ownerName}
        <a href="/humans/{pet.humanId}" class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">
          View {pet.ownerName}
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
