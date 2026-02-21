<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
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

  let showCreateForm = $state(false);
  let city = $state("");
  let country = $state("");

  function resetForm() {
    city = "";
    country = "";
    showCreateForm = false;
  }

  const formResult = $derived(form as FormResult);

  $effect(() => {
    if (formResult?.success) {
      resetForm();
    }
  });
</script>

<EntityListPage
  title="Geo-Interests"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Geo-Interests" }]}
  items={geoInterests}
  error={formResult?.error}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "city", label: "City" },
    { key: "country", label: "Country" },
    { key: "humanCount", label: "Interested Humans" },
    { key: "expressionCount", label: "Expressions" },
    { key: "createdAt", label: "Created" },
  ]}
  searchFilter={(gi, q) =>
    gi.city.toLowerCase().includes(q) ||
    gi.country.toLowerCase().includes(q) ||
    gi.displayId.toLowerCase().includes(q)
  }
  searchPlaceholder="Search by city, country, or ID..."
  deleteAction="?/delete"
  deleteMessage="Are you sure you want to delete this geo-interest? This cannot be undone."
  canDelete={data.userRole === "admin"}
>
  {#snippet headerAction()}
    <Button type="button" onclick={() => (showCreateForm = !showCreateForm)}>
      {showCreateForm ? "Cancel" : "New Geo-Interest"}
    </Button>
  {/snippet}
  {#snippet beforeTable()}
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
  {/snippet}
  {#snippet desktopRow(gi)}
    <td class="font-mono text-sm">
      <a href="/geo-interests/{gi.id}" class="text-accent hover:text-[var(--link-hover)]">{gi.displayId}</a>
    </td>
    <td class="font-medium">
      <a href="/geo-interests/{gi.id}" class="text-accent hover:text-[var(--link-hover)]">{gi.city}</a>
    </td>
    <td>{gi.country}</td>
    <td>{gi.humanCount}</td>
    <td>{gi.expressionCount}</td>
    <td class="text-text-muted text-sm">{new Date(gi.createdAt).toLocaleDateString()}</td>
  {/snippet}
  {#snippet mobileCard(gi)}
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
          <button type="button" class="text-destructive-foreground hover:opacity-80 text-xs" onclick={(e) => { e.preventDefault(); }}>Delete</button>
        </div>
      {/if}
    </a>
  {/snippet}
</EntityListPage>
