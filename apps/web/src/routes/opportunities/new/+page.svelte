<script lang="ts">
  import type { ActionData, PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type HumanOption = { id: string; displayId?: string; firstName: string; lastName: string };
  type PetOption = { id: string; displayId?: string; name: string; type: string; humanId: string | null };

  const allHumans = $derived(data.allHumans as HumanOption[]);
  const allPets = $derived(data.allPets as PetOption[]);

  let selectedHumanId = $state("");
  let selectedPetIds = $state<string[]>([]);
  let passengerSeats = $state(1);
  let petSeats = $state(0);

  const humanOptions = $derived(
    allHumans.map((h) => ({
      value: h.id,
      label: `${h.displayId ? h.displayId + " — " : ""}${h.firstName} ${h.lastName}`,
    }))
  );

  // Only show pets owned by the selected human
  const availablePetOptions = $derived(
    selectedHumanId
      ? allPets
          .filter((p) => p.humanId === selectedHumanId && !selectedPetIds.includes(p.id))
          .map((p) => ({
            value: p.id,
            label: `${p.displayId ? p.displayId + " — " : ""}${p.name} (${p.type === "cat" ? "Cat" : "Dog"})`,
          }))
      : []
  );

  const selectedPetLabels = $derived(
    selectedPetIds.map((id) => {
      const pet = allPets.find((p) => p.id === id);
      return pet ? `${pet.name} (${pet.type === "cat" ? "Cat" : "Dog"})` : id;
    })
  );

  function addPet(petId: string) {
    if (petId && !selectedPetIds.includes(petId)) {
      selectedPetIds = [...selectedPetIds, petId];
    }
  }

  function removePet(petId: string) {
    selectedPetIds = selectedPetIds.filter((id) => id !== petId);
  }

  // Reset pet selection when human changes
  $effect(() => {
    if (selectedHumanId) {
      // Keep only pets that belong to the newly selected human
      const validPets = allPets.filter((p) => p.humanId === selectedHumanId).map((p) => p.id);
      selectedPetIds = selectedPetIds.filter((id) => validPets.includes(id));
    } else {
      selectedPetIds = [];
    }
  });
</script>

<svelte:head>
  <title>New Opportunity - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="New Opportunity"
    breadcrumbs={[{ label: "Opportunities", href: "/opportunities" }, { label: "New" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <form method="POST" action="?/create" class="space-y-6 glass-card p-6">
    <!-- Primary Passenger -->
    <div>
      <label for="humanSelect" class="block text-sm font-medium text-text-secondary mb-1">Primary Passenger</label>
      <SearchableSelect
        options={humanOptions}
        name="humanId"
        id="humanSelect"
        required={true}
        emptyOption="Select a passenger..."
        placeholder="Search humans..."
        onSelect={(v) => { selectedHumanId = v; }}
      />
    </div>

    <!-- Pet(s) -->
    <div>
      <label for="petSelect" class="block text-sm font-medium text-text-secondary mb-1">Pet(s)</label>
      {#if selectedPetIds.length > 0}
        <div class="flex flex-wrap gap-2 mb-2">
          {#each selectedPetLabels as label, i}
            <span class="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-3 py-1 text-sm">
              {label}
              <button type="button" class="ml-1 text-text-muted hover:text-text-primary" onclick={() => removePet(selectedPetIds[i])}>
                &times;
              </button>
            </span>
          {/each}
        </div>
      {/if}
      <SearchableSelect
        options={availablePetOptions}
        name="_petSelect"
        id="petSelect"
        emptyOption="Select a pet..."
        placeholder="Search pets..."
        onSelect={(v) => addPet(v)}
      />
      {#if !selectedHumanId}
        <p class="text-xs text-text-muted mt-1">Select a passenger first to see their pets.</p>
      {:else if availablePetOptions.length === 0 && selectedPetIds.length === 0}
        <p class="text-xs text-text-muted mt-1">No pets found for this passenger.</p>
      {/if}
      <!-- Hidden inputs for form submission -->
      {#each selectedPetIds as petId}
        <input type="hidden" name="petIds" value={petId} />
      {/each}
    </div>

    <!-- Seats -->
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="passengerSeats" class="block text-sm font-medium text-text-secondary mb-1">Passenger (Human) Seats</label>
        <input
          id="passengerSeats" name="passengerSeats" type="number" min="0" bind:value={passengerSeats}
          class="glass-input block w-full px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label for="petSeats" class="block text-sm font-medium text-text-secondary mb-1">Pet Seats</label>
        <input
          id="petSeats" name="petSeats" type="number" min="0" bind:value={petSeats}
          class="glass-input block w-full px-3 py-2 text-sm"
        />
      </div>
    </div>

    <div class="flex gap-3">
      <Button type="submit">Create Opportunity</Button>
      <a href="/opportunities" class="btn-ghost">Cancel</a>
    </div>
  </form>
</div>
