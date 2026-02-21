<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { Search } from "lucide-svelte";
  import { COUNTRIES } from "@humans/shared";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type FormResult = { error?: string; success?: boolean } | null;

  type GeoInterest = {
    id: string;
    displayId: string;
    city: string;
    country: string;
    humanCount: number;
    expressionCount: number;
    createdAt: string;
  };

  const geoInterests = $derived(data.geoInterests as GeoInterest[]);

  let search = $state("");

  const filtered = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return geoInterests;
    return geoInterests.filter((gi) =>
      gi.city.toLowerCase().includes(q) ||
      gi.country.toLowerCase().includes(q) ||
      gi.displayId.toLowerCase().includes(q)
    );
  });

  let showCreateForm = $state(false);
  let city = $state("");
  let country = $state("");

  function resetForm() {
    city = "";
    country = "";
    showCreateForm = false;
  }

  // Reset form on successful creation
  const formResult = $derived(form as FormResult);

  $effect(() => {
    if (formResult?.success) {
      resetForm();
    }
  });

  let pendingDeleteId = $state<string | null>(null);
  let deleteFormEl = $state<HTMLFormElement>();
</script>

<svelte:head>
  <title>Geo-Interests - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Geo-Interests" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Geo-Interests" }]}>
    {#snippet action()}
      <Button type="button" onclick={() => (showCreateForm = !showCreateForm)}>
        {showCreateForm ? "Cancel" : "New Geo-Interest"}
      </Button>
    {/snippet}
  </PageHeader>

  {#if formResult?.error}
    <AlertBanner type="error" message={formResult.error} />
  {/if}
  {#if formResult?.success}
    <AlertBanner type="success" message="Geo-interest created." />
  {/if}

  {#if showCreateForm}
    <form method="POST" action="?/create" class="glass-card p-5 mb-6 space-y-4 relative z-10">
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
        <div>
          <label for="countrySelect" class="block text-sm font-medium text-text-secondary mb-1">Country</label>
          <SearchableSelect
            options={COUNTRIES}
            name="country"
            id="countrySelect"
            placeholder="Search countries..."
            emptyMessage="No countries found"
            onSelect={(v) => { country = v; }}
          />
        </div>
      </div>
      <div class="flex gap-3">
        <Button type="submit" disabled={!city.trim() || !country}>
          Create Geo-Interest
        </Button>
        <Button type="button" variant="ghost" onclick={resetForm}>Cancel</Button>
      </div>
    </form>
  {/if}

  <!-- Search -->
  <div class="mb-6">
    <div class="relative max-w-md">
      <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      <input type="text" bind:value={search} placeholder="Search by city, country, or ID..." class="glass-input w-full pl-9 pr-3 py-2 text-sm" />
    </div>
  </div>

  <!-- Mobile card view -->
  <div class="sm:hidden space-y-3">
    {#each filtered as gi (gi.id)}
      <a href="/geo-interests/{gi.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
        <span class="font-mono text-xs text-text-muted">{gi.displayId}</span>
        <div class="flex items-center justify-between mb-1">
          <span class="font-medium text-accent">{gi.city}</span>
          <span class="text-sm text-text-secondary">{gi.country}</span>
        </div>
        <div class="flex gap-4 text-sm text-text-muted">
          <span>{gi.humanCount} humans</span>
          <span>{gi.expressionCount} expressions</span>
        </div>
        {#if data.userRole === "admin"}
          <div class="mt-2 flex justify-end">
            <button type="button" class="text-red-400 hover:text-red-300 text-xs" onclick={(e) => { e.preventDefault(); pendingDeleteId = gi.id; }}>Delete</button>
          </div>
        {/if}
      </a>
    {:else}
      <div class="glass-card p-6 text-center text-sm text-text-muted">No geo-interests found.</div>
    {/each}
  </div>

  <!-- Desktop table view -->
  <div class="glass-card overflow-hidden hidden sm:block">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th scope="col">ID</th>
          <th scope="col">City</th>
          <th scope="col">Country</th>
          <th scope="col">Interested Humans</th>
          <th scope="col">Expressions</th>
          <th scope="col">Created</th>
          {#if data.userRole === "admin"}
            <th scope="col">Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each filtered as gi (gi.id)}
          <tr class="glass-row-hover">
            <td class="font-mono text-sm">
              <a href="/geo-interests/{gi.id}" class="text-accent hover:text-cyan-300">{gi.displayId}</a>
            </td>
            <td class="font-medium">
              <a href="/geo-interests/{gi.id}" class="text-accent hover:text-cyan-300">{gi.city}</a>
            </td>
            <td>{gi.country}</td>
            <td>{gi.humanCount}</td>
            <td>{gi.expressionCount}</td>
            <td class="text-text-muted text-sm">{new Date(gi.createdAt).toLocaleDateString()}</td>
            {#if data.userRole === "admin"}
              <td>
                <button type="button" class="text-red-400 hover:text-red-300 text-sm" onclick={() => { pendingDeleteId = gi.id; }}>Delete</button>
              </td>
            {/if}
          </tr>
        {:else}
          <tr>
            <td colspan={data.userRole === "admin" ? 7 : 6} class="px-6 py-8 text-center text-sm text-text-muted">No geo-interests found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden">
  <input type="hidden" name="id" value={pendingDeleteId ?? ""} />
</form>

<ConfirmDialog
  open={pendingDeleteId !== null}
  message="Are you sure you want to delete this geo-interest? This cannot be undone."
  onConfirm={() => { deleteFormEl?.requestSubmit(); pendingDeleteId = null; }}
  onCancel={() => { pendingDeleteId = null; }}
/>
