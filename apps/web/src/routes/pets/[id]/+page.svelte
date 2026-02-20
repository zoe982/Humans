<script lang="ts">
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import { toast } from "svelte-sonner";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { PET_BREEDS } from "@humans/shared/constants";
  import { onDestroy } from "svelte";

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
  <title>{pet.displayId} — {pet.name} - Humans CRM</title>
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
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {petType === 'dog' ? 'bg-[rgba(59,130,246,0.2)] text-blue-300 ring-1 ring-blue-400/30' : 'bg-glass text-text-secondary hover:bg-glass-hover'}"
        >
          Dog
        </button>
        <button
          type="button"
          onclick={() => handleTypeChange("cat")}
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {petType === 'cat' ? 'bg-[rgba(168,85,247,0.2)] text-purple-300 ring-1 ring-purple-400/30' : 'bg-glass text-text-secondary hover:bg-glass-hover'}"
        >
          Cat
        </button>
      </div>
    </div>

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

    <div>
      <label for="petWeight" class="block text-sm font-medium text-text-secondary">Weight (kg)</label>
      <input
        id="petWeight" type="number" step="0.1" min="0"
        bind:value={petWeight}
        oninput={triggerSave}
        class="glass-input mt-1 block w-full"
      />
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
        <a href="/humans/{pet.humanId}" class="mt-1 inline-block text-sm text-accent hover:text-cyan-300">
          View {pet.ownerName}
        </a>
      {/if}
    </div>
  </div>
</div>
