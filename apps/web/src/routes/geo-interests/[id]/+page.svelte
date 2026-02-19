<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type FormResult = { error?: string; success?: boolean } | null;

  type Expression = {
    id: string;
    humanId: string;
    geoInterestId: string;
    activityId: string | null;
    notes: string | null;
    createdAt: string;
    humanName: string | null;
    activitySubject: string | null;
  };

  type GeoInterest = {
    id: string;
    city: string;
    country: string;
    createdAt: string;
    expressions: Expression[];
  };

  type Human = {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
  };

  const geoInterest = $derived(data.geoInterest as GeoInterest);
  const humans = $derived(data.humans as Human[]);

  let showAddForm = $state(false);
  let humanSearch = $state("");
  let selectedHumanId = $state("");
  let showHumanDropdown = $state(false);
  let notes = $state("");

  function humanDisplayName(h: Human): string {
    return [h.firstName, h.middleName, h.lastName].filter(Boolean).join(" ");
  }

  const filteredHumans = $derived(
    humanSearch.trim().length === 0
      ? humans
      : humans.filter((h) =>
          humanDisplayName(h).toLowerCase().includes(humanSearch.toLowerCase())
        )
  );

  function selectHuman(h: Human) {
    selectedHumanId = h.id;
    humanSearch = humanDisplayName(h);
    showHumanDropdown = false;
  }

  function handleHumanInput() {
    showHumanDropdown = true;
    selectedHumanId = "";
  }

  function handleHumanBlur() {
    setTimeout(() => {
      showHumanDropdown = false;
    }, 200);
  }

  function resetAddForm() {
    humanSearch = "";
    selectedHumanId = "";
    notes = "";
    showAddForm = false;
  }

  const formResult = $derived(form as FormResult);

  $effect(() => {
    if (formResult?.success) {
      resetAddForm();
    }
  });
</script>

<svelte:head>
  <title>{geoInterest.city}, {geoInterest.country} - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/geo-interests"
    backLabel="Geo-Interests"
    title="{geoInterest.city}, {geoInterest.country}"
  />

  {#if formResult?.error}
    <AlertBanner type="error" message={formResult.error} />
  {/if}
  {#if formResult?.success}
    <AlertBanner type="success" message="Expression added." />
  {/if}

  <!-- Delete geo-interest -->
  <div class="mb-6 flex justify-end">
    <form method="POST" action="?/delete">
      <button type="submit" class="btn-danger text-sm" onclick={(e) => { if (!confirm('Delete this geo-interest and all its expressions?')) e.preventDefault(); }}>
        Delete Geo-Interest
      </button>
    </form>
  </div>

  <!-- Expressions -->
  <div class="glass-card p-5">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-text-primary">
        Expressions ({geoInterest.expressions.length})
      </h2>
      <button
        type="button"
        class="btn-ghost text-sm py-1 px-3"
        onclick={() => (showAddForm = !showAddForm)}
      >
        {showAddForm ? "Cancel" : "+ Add Expression"}
      </button>
    </div>

    {#if showAddForm}
      <form method="POST" action="?/createExpression" class="mb-4 p-4 rounded-lg bg-glass border border-glass-border space-y-3">
        <input type="hidden" name="humanId" value={selectedHumanId} />
        <div class="relative">
          <label for="humanSearch" class="block text-sm font-medium text-text-secondary mb-1">Human</label>
          <input
            id="humanSearch"
            type="text"
            autocomplete="off"
            bind:value={humanSearch}
            oninput={handleHumanInput}
            onfocus={() => (showHumanDropdown = true)}
            onblur={handleHumanBlur}
            placeholder="Search humans..."
            class="glass-input block w-full px-3 py-2 text-sm"
          />
          {#if showHumanDropdown && filteredHumans.length > 0}
            <div class="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-glass-border bg-surface-raised shadow-lg">
              {#each filteredHumans as h (h.id)}
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-glass-hover transition-colors {h.id === selectedHumanId ? 'bg-accent-dim text-accent' : ''}"
                  onmousedown={(e) => { e.preventDefault(); selectHuman(h); }}
                >
                  {humanDisplayName(h)}
                </button>
              {/each}
            </div>
          {/if}
          {#if showHumanDropdown && filteredHumans.length === 0 && humanSearch.trim().length > 0}
            <div class="absolute z-50 mt-1 w-full rounded-lg border border-glass-border bg-surface-raised shadow-lg">
              <p class="px-3 py-2 text-sm text-text-muted">No humans found.</p>
            </div>
          {/if}
        </div>
        <div>
          <label for="notes" class="block text-sm font-medium text-text-secondary mb-1">Notes (optional)</label>
          <textarea
            id="notes" name="notes"
            bind:value={notes}
            rows="2"
            placeholder="Any notes about this expression of interest..."
            class="glass-input block w-full px-3 py-2 text-sm"
          ></textarea>
        </div>
        <div class="flex gap-3">
          <button type="submit" class="btn-primary text-sm" disabled={!selectedHumanId}>
            Add Expression
          </button>
          <button type="button" class="btn-ghost text-sm" onclick={resetAddForm}>Cancel</button>
        </div>
      </form>
    {/if}

    {#if geoInterest.expressions.length === 0 && !showAddForm}
      <p class="text-text-muted text-sm">No expressions yet.</p>
    {:else}
      <div class="space-y-2">
        {#each geoInterest.expressions as expr (expr.id)}
          <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                {#if expr.humanName}
                  <a href="/humans/{expr.humanId}" class="text-sm font-medium text-accent hover:text-cyan-300">
                    {expr.humanName}
                  </a>
                {:else}
                  <span class="text-sm text-text-muted">Unknown human</span>
                {/if}
                {#if expr.activitySubject}
                  <span class="text-xs text-text-muted">via activity: {expr.activitySubject}</span>
                {/if}
              </div>
              {#if expr.notes}
                <p class="mt-1 text-sm text-text-secondary">{expr.notes}</p>
              {/if}
              <p class="mt-1 text-xs text-text-muted">{new Date(expr.createdAt).toLocaleDateString()}</p>
            </div>
            <form method="POST" action="?/deleteExpression">
              <input type="hidden" name="expressionId" value={expr.id} />
              <button type="submit" class="text-red-400 hover:text-red-300 text-sm ml-3">
                Remove
              </button>
            </form>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
