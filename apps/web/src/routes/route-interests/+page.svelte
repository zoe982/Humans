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

  const filteredRoutes = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return routeInterests;
    return routeInterests.filter((ri) =>
      ri.originCity.toLowerCase().includes(q) ||
      ri.originCountry.toLowerCase().includes(q) ||
      ri.destinationCity.toLowerCase().includes(q) ||
      ri.destinationCountry.toLowerCase().includes(q) ||
      ri.displayId.toLowerCase().includes(q)
    );
  });

  const filteredExpressions = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expressions;
    return expressions.filter((expr) =>
      (expr.humanName?.toLowerCase().includes(q)) ||
      (expr.originCity?.toLowerCase().includes(q)) ||
      (expr.originCountry?.toLowerCase().includes(q)) ||
      (expr.destinationCity?.toLowerCase().includes(q)) ||
      (expr.destinationCountry?.toLowerCase().includes(q)) ||
      (expr.notes?.toLowerCase().includes(q)) ||
      expr.displayId.toLowerCase().includes(q)
    );
  });

  let view: "routes" | "expressions" = $state("routes");
  let showCreateForm = $state(false);

  let pendingDeleteId = $state<string | null>(null);
  let deleteFormEl = $state<HTMLFormElement>();

  const formResult = $derived(form as FormResult);

  $effect(() => {
    if (formResult?.success) {
      showCreateForm = false;
    }
  });

  const MONTH_OPTIONS = [
    { value: "1", label: "01 - January" },
    { value: "2", label: "02 - February" },
    { value: "3", label: "03 - March" },
    { value: "4", label: "04 - April" },
    { value: "5", label: "05 - May" },
    { value: "6", label: "06 - June" },
    { value: "7", label: "07 - July" },
    { value: "8", label: "08 - August" },
    { value: "9", label: "09 - September" },
    { value: "10", label: "10 - October" },
    { value: "11", label: "11 - November" },
    { value: "12", label: "12 - December" },
  ];

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

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Route Interests" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Route Interests" }]}>
    {#snippet action()}
      <div class="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === 'routes' ? 'default' : 'ghost'}
          onclick={() => (view = "routes")}
        >
          Routes
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === 'expressions' ? 'default' : 'ghost'}
          onclick={() => (view = "expressions")}
        >
          Expressions
        </Button>
      </div>
    {/snippet}
  </PageHeader>

  {#if formResult?.error}
    <AlertBanner type="error" message={formResult.error} />
  {/if}
  {#if formResult?.success}
    <AlertBanner type="success" message="Route interest created." />
  {/if}

  <!-- Search -->
  <div class="mt-4 mb-6">
    <div class="relative max-w-md">
      <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      <input type="text" bind:value={search} placeholder="Search routes, cities, countries..." class="glass-input w-full pl-9 pr-3 py-2 text-sm" />
    </div>
  </div>

  {#if view === "routes"}
    <!-- Create form -->
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
              <input
                id="originCity" name="originCity" type="text" required
                placeholder="e.g. London"
                class="glass-input block w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label for="originCountry" class="block text-sm font-medium text-text-secondary mb-1">Country</label>
              <SearchableSelect
                options={COUNTRIES}
                name="originCountry"
                id="originCountry"
                placeholder="Search countries..."
                emptyMessage="No countries found"
              />
            </div>
          </div>
        </div>
        <div>
          <span class="text-xs font-medium text-text-muted uppercase tracking-wide">Destination</span>
          <div class="grid gap-4 sm:grid-cols-2 mt-1">
            <div>
              <label for="destinationCity" class="block text-sm font-medium text-text-secondary mb-1">City</label>
              <input
                id="destinationCity" name="destinationCity" type="text" required
                placeholder="e.g. Paris"
                class="glass-input block w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label for="destinationCountry" class="block text-sm font-medium text-text-secondary mb-1">Country</label>
              <SearchableSelect
                options={COUNTRIES}
                name="destinationCountry"
                id="destinationCountry"
                placeholder="Search countries..."
                emptyMessage="No countries found"
              />
            </div>
          </div>
        </div>
        <div class="flex gap-3">
          <Button type="submit">Create Route Interest</Button>
          <Button type="button" variant="ghost" onclick={() => (showCreateForm = false)}>Cancel</Button>
        </div>
      </form>
    {/if}

    <!-- Mobile card view -->
    <div class="sm:hidden space-y-3">
      {#each filteredRoutes as ri (ri.id)}
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
              <button type="button" class="text-red-400 hover:text-red-300 text-xs" onclick={(e) => { e.preventDefault(); pendingDeleteId = ri.id; }}>Delete</button>
            </div>
          {/if}
        </a>
      {:else}
        <div class="glass-card p-6 text-center text-sm text-text-muted">No route interests found.</div>
      {/each}
    </div>

    <!-- Desktop table view -->
    <div class="glass-card overflow-hidden hidden sm:block">
      <table class="min-w-full">
        <thead class="glass-thead">
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Origin</th>
            <th scope="col">Destination</th>
            <th scope="col">Humans</th>
            <th scope="col">Expressions</th>
            <th scope="col">Created</th>
            {#if data.userRole === "admin"}
              <th scope="col">Actions</th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#each filteredRoutes as ri (ri.id)}
            <tr class="glass-row-hover">
              <td class="font-mono text-sm">
                <a href="/route-interests/{ri.id}" class="text-accent hover:text-cyan-300">{ri.displayId}</a>
              </td>
              <td>
                <a href="/route-interests/{ri.id}" class="text-accent hover:text-cyan-300">{ri.originCity}</a>
                <span class="text-text-muted text-sm">, {ri.originCountry}</span>
              </td>
              <td>
                <a href="/route-interests/{ri.id}" class="text-accent hover:text-cyan-300">{ri.destinationCity}</a>
                <span class="text-text-muted text-sm">, {ri.destinationCountry}</span>
              </td>
              <td>{ri.humanCount}</td>
              <td>{ri.expressionCount}</td>
              <td class="text-text-muted text-sm">{new Date(ri.createdAt).toLocaleDateString()}</td>
              {#if data.userRole === "admin"}
                <td>
                  <button type="button" class="text-red-400 hover:text-red-300 text-sm" onclick={() => { pendingDeleteId = ri.id; }}>Delete</button>
                </td>
              {/if}
            </tr>
          {:else}
            <tr>
              <td colspan={data.userRole === "admin" ? 7 : 6} class="px-6 py-8 text-center text-sm text-text-muted">No route interests found.</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <!-- Expressions view -->
    <!-- Mobile card view -->
    <div class="sm:hidden space-y-3">
      {#each filteredExpressions as expr (expr.id)}
        <a href="/route-interests/expressions/{expr.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
          <div class="flex items-center justify-between mb-1">
            <span class="font-mono text-xs text-text-muted">{expr.displayId}</span>
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {expr.frequency === 'repeat' ? 'bg-[rgba(168,85,247,0.15)] text-purple-300' : 'bg-glass text-text-secondary'}">
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
                <a href="/route-interests/expressions/{expr.id}" class="text-accent hover:text-cyan-300">{expr.displayId}</a>
              </td>
              <td>
                {#if expr.humanName}
                  <a href="/humans/{expr.humanId}" class="text-accent hover:text-cyan-300">{expr.humanName}</a>
                {:else}
                  <span class="text-text-muted">Unknown</span>
                {/if}
              </td>
              <td>
                <a href="/route-interests/{expr.routeInterestId}" class="text-accent hover:text-cyan-300">
                  {expr.originCity ?? "\u2014"} &rarr; {expr.destinationCity ?? "\u2014"}
                </a>
              </td>
              <td>
                <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {expr.frequency === 'repeat' ? 'bg-[rgba(168,85,247,0.15)] text-purple-300' : 'bg-glass text-text-secondary'}">
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
  {/if}
</div>

<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden">
  <input type="hidden" name="id" value={pendingDeleteId ?? ""} />
</form>

<ConfirmDialog
  open={pendingDeleteId !== null}
  message="Are you sure you want to delete this route interest? This will also delete all expressions. This cannot be undone."
  onConfirm={() => { deleteFormEl?.requestSubmit(); pendingDeleteId = null; }}
  onCancel={() => { pendingDeleteId = null; }}
/>
