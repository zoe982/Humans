<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { Search } from "lucide-svelte";
  import { COUNTRIES } from "@humans/shared";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type FormResult = { error?: string; success?: boolean } | null;

  type RouteInterest = {
    id: string;
    displayId: string;
    originCity: string;
    originCountry: string;
    destinationCity: string;
    destinationCountry: string;
    humanCount: number;
    expressionCount: number;
    createdAt: string;
  };

  type Expression = {
    id: string;
    displayId: string;
    humanId: string;
    routeInterestId: string;
    humanName: string | null;
    originCity: string | null;
    originCountry: string | null;
    destinationCity: string | null;
    destinationCountry: string | null;
    frequency: string;
    travelYear: number | null;
    travelMonth: number | null;
    travelDay: number | null;
    notes: string | null;
    activitySubject: string | null;
    createdAt: string;
  };

  const routeInterests = $derived(data.routeInterests as RouteInterest[]);
  const expressions = $derived(data.expressions as Expression[]);

  let search = $state("");
  let view: "routes" | "expressions" = $state("routes");
  let showCreateForm = $state(false);

  const filteredExpressions = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expressions;
    return expressions.filter((expr) =>
      (expr.humanName?.toLowerCase().includes(q) ?? false) ||
      (expr.originCity?.toLowerCase().includes(q) ?? false) ||
      (expr.originCountry?.toLowerCase().includes(q) ?? false) ||
      (expr.destinationCity?.toLowerCase().includes(q) ?? false) ||
      (expr.destinationCountry?.toLowerCase().includes(q) ?? false) ||
      (expr.notes?.toLowerCase().includes(q) ?? false) ||
      expr.displayId.toLowerCase().includes(q)
    );
  });

  let pendingDeleteId = $state<string | null>(null);
  let deleteFormEl = $state<HTMLFormElement>();

  const formResult = $derived(form as FormResult);

  $effect(() => {
    if (formResult?.success) {
      showCreateForm = false;
    }
  });

  function formatTravelDate(expr: Expression): string {
    if (!expr.travelYear) return "";
    let d = String(expr.travelYear);
    if (expr.travelMonth) {
      d += `-${String(expr.travelMonth).padStart(2, "0")}`;
      if (expr.travelDay) d += `-${String(expr.travelDay).padStart(2, "0")}`;
    }
    return d;
  }
</script>

<svelte:head>
  <title>Route Interests - Humans</title>
</svelte:head>

{#if view === "routes"}
  <EntityListPage
    title="Route Interests"
    breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Route Interests" }]}
    items={routeInterests}
    error={formResult?.error}
    columns={[
      { key: "displayId", label: "ID" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
      { key: "humanCount", label: "Humans" },
      { key: "expressionCount", label: "Expressions" },
      { key: "createdAt", label: "Created" },
    ]}
    searchFilter={(ri, q) =>
      ri.originCity.toLowerCase().includes(q) ||
      ri.originCountry.toLowerCase().includes(q) ||
      ri.destinationCity.toLowerCase().includes(q) ||
      ri.destinationCountry.toLowerCase().includes(q) ||
      ri.displayId.toLowerCase().includes(q)
    }
    searchPlaceholder="Search routes, cities, countries..."
    deleteAction="?/delete"
    deleteMessage="Are you sure you want to delete this route interest? This will also delete all expressions. This cannot be undone."
    canDelete={data.userRole === "admin"}
  >
    {#snippet headerAction()}
      <div class="flex gap-2">
        <Button type="button" size="sm" variant="default" onclick={() => (view = "routes")}>Routes</Button>
        <Button type="button" size="sm" variant="ghost" onclick={() => (view = "expressions")}>Expressions</Button>
      </div>
    {/snippet}
    {#snippet beforeTable()}
      {#if formResult?.success}
        <AlertBanner type="success" message="Route interest created." />
      {/if}

      <div class="mb-6 flex justify-end">
        <Button type="button" size="sm" onclick={() => (showCreateForm = !showCreateForm)}>
          {showCreateForm ? "Cancel" : "New Route Interest"}
        </Button>
      </div>

      {#if showCreateForm}
        <form method="POST" action="?/create" class="glass-card p-5 mb-6 space-y-4 relative z-10">
          <h2 class="text-lg font-semibold text-text-primary">New Route Interest</h2>
          <div>
            <span class="text-xs font-medium text-text-muted uppercase tracking-wide">Origin</span>
            <div class="grid gap-4 sm:grid-cols-2 mt-1">
              <div>
                <label for="originCity" class="block text-sm font-medium text-text-secondary mb-1">City</label>
                <input id="originCity" name="originCity" type="text" required placeholder="e.g. London" class="glass-input block w-full px-3 py-2 text-sm" />
              </div>
              <div>
                <label for="originCountry" class="block text-sm font-medium text-text-secondary mb-1">Country</label>
                <SearchableSelect options={COUNTRIES} name="originCountry" id="originCountry" placeholder="Search countries..." emptyMessage="No countries found" />
              </div>
            </div>
          </div>
          <div>
            <span class="text-xs font-medium text-text-muted uppercase tracking-wide">Destination</span>
            <div class="grid gap-4 sm:grid-cols-2 mt-1">
              <div>
                <label for="destinationCity" class="block text-sm font-medium text-text-secondary mb-1">City</label>
                <input id="destinationCity" name="destinationCity" type="text" required placeholder="e.g. Paris" class="glass-input block w-full px-3 py-2 text-sm" />
              </div>
              <div>
                <label for="destinationCountry" class="block text-sm font-medium text-text-secondary mb-1">Country</label>
                <SearchableSelect options={COUNTRIES} name="destinationCountry" id="destinationCountry" placeholder="Search countries..." emptyMessage="No countries found" />
              </div>
            </div>
          </div>
          <div class="flex gap-3">
            <Button type="submit">Create Route Interest</Button>
            <Button type="button" variant="ghost" onclick={() => (showCreateForm = false)}>Cancel</Button>
          </div>
        </form>
      {/if}
    {/snippet}
    {#snippet desktopRow(ri)}
      <td class="font-mono text-sm">
        <a href="/route-interests/{ri.id}" class="text-accent hover:text-[var(--link-hover)]">{ri.displayId}</a>
      </td>
      <td>
        <a href="/route-interests/{ri.id}" class="text-accent hover:text-[var(--link-hover)]">{ri.originCity}</a>
        <span class="text-text-muted text-sm">, {ri.originCountry}</span>
      </td>
      <td>
        <a href="/route-interests/{ri.id}" class="text-accent hover:text-[var(--link-hover)]">{ri.destinationCity}</a>
        <span class="text-text-muted text-sm">, {ri.destinationCountry}</span>
      </td>
      <td>{ri.humanCount}</td>
      <td>{ri.expressionCount}</td>
      <td class="text-text-muted text-sm">{new Date(ri.createdAt).toLocaleDateString()}</td>
    {/snippet}
    {#snippet mobileCard(ri)}
      <a href="/route-interests/{ri.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
        <span class="font-mono text-xs text-text-muted">{ri.displayId}</span>
        <div class="flex items-center gap-2 mb-1">
          <span class="font-medium text-accent">{ri.originCity}</span>
          <span class="text-text-muted">&rarr;</span>
          <span class="font-medium text-accent">{ri.destinationCity}</span>
        </div>
        <div class="text-xs text-text-secondary mb-1">
          {ri.originCountry} &rarr; {ri.destinationCountry}
        </div>
        <div class="flex gap-4 text-sm text-text-muted">
          <span>{ri.humanCount} humans</span>
          <span>{ri.expressionCount} expressions</span>
        </div>
        {#if data.userRole === "admin"}
          <div class="mt-2 flex justify-end">
            <button type="button" class="text-destructive-foreground hover:opacity-80 text-xs" onclick={(e) => { e.preventDefault(); }}>Delete</button>
          </div>
        {/if}
      </a>
    {/snippet}
  </EntityListPage>
{:else}
  <!-- Expressions view — kept inline since it has a different data model -->
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text-primary">Route Interests</h1>
        <div class="flex gap-2">
          <Button type="button" size="sm" variant="ghost" onclick={() => (view = "routes")}>Routes</Button>
          <Button type="button" size="sm" variant="default" onclick={() => (view = "expressions")}>Expressions</Button>
        </div>
      </div>
    </div>

    {#if formResult?.error}
      <AlertBanner type="error" message={formResult.error} />
    {/if}

    <div class="mt-4 mb-6">
      <div class="relative max-w-md">
        <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input type="text" bind:value={search} placeholder="Search routes, cities, countries..." class="glass-input w-full pl-9 pr-3 py-2 text-sm" />
      </div>
    </div>

    <!-- Mobile card view -->
    <div class="sm:hidden space-y-3">
      {#each filteredExpressions as expr (expr.id)}
        <a href="/route-interests/expressions/{expr.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
          <div class="flex items-center justify-between mb-1">
            <span class="font-mono text-xs text-text-muted">{expr.displayId}</span>
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {expr.frequency === 'repeat' ? 'badge-purple' : 'bg-glass text-text-secondary'}">
              {expr.frequency === "repeat" ? "Repeat" : "One-time"}
            </span>
          </div>
          {#if expr.humanName}
            <span class="text-sm font-medium text-accent">{expr.humanName}</span>
          {/if}
          <div class="text-sm text-text-secondary mt-1">
            {expr.originCity ?? "\u2014"} &rarr; {expr.destinationCity ?? "\u2014"}
          </div>
          {#if formatTravelDate(expr)}
            <div class="text-xs text-text-muted mt-1">Travel: {formatTravelDate(expr)}</div>
          {/if}
          {#if expr.notes}
            <p class="mt-1 text-sm text-text-secondary truncate">{expr.notes}</p>
          {/if}
        </a>
      {:else}
        <div class="glass-card p-6 text-center text-sm text-text-muted">No expressions found.</div>
      {/each}
    </div>

    <!-- Desktop table view -->
    <div class="glass-card overflow-hidden hidden sm:block">
      <table class="min-w-full">
        <thead class="glass-thead">
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Human</th>
            <th scope="col">Route</th>
            <th scope="col">Frequency</th>
            <th scope="col">Travel Date</th>
            <th scope="col">Activity</th>
            <th scope="col">Notes</th>
            <th scope="col">Created</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredExpressions as expr (expr.id)}
            <tr class="glass-row-hover">
              <td class="font-mono text-sm">
                <a href="/route-interests/expressions/{expr.id}" class="text-accent hover:text-[var(--link-hover)]">{expr.displayId}</a>
              </td>
              <td>
                {#if expr.humanName}
                  <a href="/humans/{expr.humanId}" class="text-accent hover:text-[var(--link-hover)]">{expr.humanName}</a>
                {:else}
                  <span class="text-text-muted">Unknown</span>
                {/if}
              </td>
              <td>
                <a href="/route-interests/{expr.routeInterestId}" class="text-accent hover:text-[var(--link-hover)]">
                  {expr.originCity ?? "\u2014"} &rarr; {expr.destinationCity ?? "\u2014"}
                </a>
              </td>
              <td>
                <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {expr.frequency === 'repeat' ? 'badge-purple' : 'bg-glass text-text-secondary'}">
                  {expr.frequency === "repeat" ? "Repeat" : "One-time"}
                </span>
              </td>
              <td class="text-text-muted text-sm">{formatTravelDate(expr) || "\u2014"}</td>
              <td class="text-sm text-text-secondary">{expr.activitySubject ?? "\u2014"}</td>
              <td class="text-sm text-text-secondary max-w-xs truncate">{expr.notes ?? "\u2014"}</td>
              <td class="text-text-muted text-sm">{new Date(expr.createdAt).toLocaleDateString()}</td>
            </tr>
          {:else}
            <tr>
              <td colspan="8" class="px-6 py-8 text-center text-sm text-text-muted">No expressions found.</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden">
    <input type="hidden" name="id" value={pendingDeleteId ?? ""} />
  </form>
{/if}
