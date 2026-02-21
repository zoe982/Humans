<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { PET_BREEDS } from "@humans/shared/constants";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  const allHumans = $derived(data.allHumans as HumanListItem[]);

  const humanOptions = $derived(
    allHumans.map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName} (${h.displayId})` }))
  );

  let petType = $state("dog");
  let breedDropdownOpen = $state(false);
</script>

<svelte:head>
  <title>New Pet - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="New Pet"
    breadcrumbs={[{ label: "Pets", href: "/pets" }, { label: "New" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <form method="POST" action="?/create" class="space-y-6 glass-card p-6">
    <div>
      <label for="owner" class="block text-sm font-medium text-text-secondary mb-1">Owner <span class="text-red-400">*</span></label>
      <SearchableSelect
        options={humanOptions}
        name="humanId"
        id="owner"
        placeholder="Search owners..."
      />
    </div>

    <div>
      <label for="petName" class="block text-sm font-medium text-text-secondary mb-1">Name <span class="text-red-400">*</span></label>
      <input
        id="petName" name="name" type="text" required
        class="glass-input block w-full px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-text-secondary mb-2">Type</label>
      <div class="flex gap-2">
        <button
          type="button"
          onclick={() => { petType = "dog"; }}
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {petType === 'dog' ? 'bg-[rgba(59,130,246,0.2)] text-blue-300 ring-1 ring-blue-400/30' : 'bg-glass text-text-secondary hover:bg-glass-hover'}"
        >
          Dog
        </button>
        <button
          type="button"
          onclick={() => { petType = "cat"; }}
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {petType === 'cat' ? 'bg-[rgba(168,85,247,0.2)] text-purple-300 ring-1 ring-purple-400/30' : 'bg-glass text-text-secondary hover:bg-glass-hover'}"
        >
          Cat
        </button>
      </div>
      <input type="hidden" name="type" value={petType} />
    </div>

    {#if petType === "dog"}
      <div class={breedDropdownOpen ? "relative z-10" : ""}>
        <label for="petBreed" class="block text-sm font-medium text-text-secondary mb-1">Breed</label>
        <SearchableSelect
          options={PET_BREEDS}
          name="breed"
          id="petBreed"
          placeholder="Search breeds..."
          emptyOption="None"
          onOpenChange={(isOpen) => { breedDropdownOpen = isOpen; }}
        />
      </div>
    {/if}

    <div>
      <label for="petWeight" class="block text-sm font-medium text-text-secondary mb-1">Weight (kg)</label>
      <input
        id="petWeight" name="weight" type="number" step="0.1" min="0"
        class="glass-input block w-full px-3 py-2 text-sm"
      />
    </div>

    <div class="flex gap-3">
      <Button type="submit">Create Pet</Button>
      <a href="/pets" class="btn-ghost">Cancel</a>
    </div>
  </form>
</div>
