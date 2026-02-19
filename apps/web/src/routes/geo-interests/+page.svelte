<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import { COUNTRIES } from "@humans/shared";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type FormResult = { error?: string; success?: boolean } | null;

  type GeoInterest = {
    id: string;
    city: string;
    country: string;
    humanCount: number;
    expressionCount: number;
    createdAt: string;
  };

  const geoInterests = $derived(data.geoInterests as GeoInterest[]);

  let showCreateForm = $state(false);
  let city = $state("");
  let country = $state("");
  let countrySearch = $state("");
  let showCountryDropdown = $state(false);

  const filteredCountries = $derived(
    countrySearch.trim().length === 0
      ? [...COUNTRIES]
      : COUNTRIES.filter((c) => c.toLowerCase().includes(countrySearch.toLowerCase()))
  );

  function selectCountry(c: string) {
    country = c;
    countrySearch = c;
    showCountryDropdown = false;
  }

  function handleCountryInput() {
    showCountryDropdown = true;
    country = "";
  }

  function handleCountryBlur() {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      showCountryDropdown = false;
      // If typed text matches a country exactly, select it
      const match = COUNTRIES.find((c) => c.toLowerCase() === countrySearch.toLowerCase());
      if (match) {
        country = match;
        countrySearch = match;
      }
    }, 200);
  }

  function resetForm() {
    city = "";
    country = "";
    countrySearch = "";
    showCreateForm = false;
  }

  // Reset form on successful creation
  const formResult = $derived(form as FormResult);

  $effect(() => {
    if (formResult?.success) {
      resetForm();
    }
  });
</script>

<svelte:head>
  <title>Geo-Interests - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Geo-Interests" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Geo-Interests" }]}>
    {#snippet action()}
      <button type="button" class="btn-primary" onclick={() => (showCreateForm = !showCreateForm)}>
        {showCreateForm ? "Cancel" : "New Geo-Interest"}
      </button>
    {/snippet}
  </PageHeader>

  {#if formResult?.error}
    <AlertBanner type="error" message={formResult.error} />
  {/if}
  {#if formResult?.success}
    <AlertBanner type="success" message="Geo-interest created." />
  {/if}

  {#if showCreateForm}
    <form method="POST" action="?/create" class="glass-card p-5 mb-6 space-y-4">
      <h2 class="text-lg font-semibold text-text-primary">New Geo-Interest</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="city" class="block text-sm font-medium text-text-secondary mb-1">City</label>
          <input
            id="city" name="city" type="text" required
            bind:value={city}
            placeholder="e.g. Paris"
            class="glass-input block w-full px-3 py-2 text-sm"
          />
        </div>
        <div class="relative">
          <label for="countrySearch" class="block text-sm font-medium text-text-secondary mb-1">Country</label>
          <input type="hidden" name="country" value={country} />
          <input
            id="countrySearch"
            type="text"
            autocomplete="off"
            required
            bind:value={countrySearch}
            oninput={handleCountryInput}
            onfocus={() => (showCountryDropdown = true)}
            onblur={handleCountryBlur}
            placeholder="Search countries..."
            class="glass-input block w-full px-3 py-2 text-sm"
          />
          {#if showCountryDropdown && filteredCountries.length > 0}
            <div class="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-glass-border bg-surface-raised shadow-lg">
              {#each filteredCountries as c (c)}
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-glass-hover transition-colors {c === country ? 'bg-accent-dim text-accent' : ''}"
                  onmousedown={(e) => { e.preventDefault(); selectCountry(c); }}
                >
                  {c}
                </button>
              {/each}
            </div>
          {/if}
          {#if countrySearch && !country && !showCountryDropdown}
            <p class="text-xs text-red-400 mt-1">Please select a country from the list.</p>
          {/if}
        </div>
      </div>
      <div class="flex gap-3">
        <button type="submit" class="btn-primary" disabled={!city.trim() || !country}>
          Create Geo-Interest
        </button>
        <button type="button" class="btn-ghost" onclick={resetForm}>Cancel</button>
      </div>
    </form>
  {/if}

  <div class="glass-card overflow-hidden">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th>City</th>
          <th>Country</th>
          <th>Interested Humans</th>
          <th>Expressions</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {#each geoInterests as gi (gi.id)}
          <tr class="glass-row-hover">
            <td class="font-medium">
              <a href="/geo-interests/{gi.id}" class="text-accent hover:text-cyan-300">{gi.city}</a>
            </td>
            <td>{gi.country}</td>
            <td>{gi.humanCount}</td>
            <td>{gi.expressionCount}</td>
            <td class="text-text-muted text-sm">{new Date(gi.createdAt).toLocaleDateString()}</td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="px-6 py-8 text-center text-sm text-text-muted">No geo-interests found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
