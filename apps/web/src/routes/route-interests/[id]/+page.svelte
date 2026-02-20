<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";

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

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type FormResult = { error?: string; success?: boolean } | null;

  type Expression = {
    id: string;
    displayId: string;
    humanId: string;
    routeInterestId: string;
    activityId: string | null;
    frequency: string;
    travelYear: number | null;
    travelMonth: number | null;
    travelDay: number | null;
    notes: string | null;
    createdAt: string;
    humanName: string | null;
    activitySubject: string | null;
  };

  type RouteInterest = {
    id: string;
    originCity: string;
    originCountry: string;
    destinationCity: string;
    destinationCountry: string;
    createdAt: string;
    expressions: Expression[];
  };

  type Human = {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
  };

  const routeInterest = $derived(data.routeInterest as RouteInterest);
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

  function formatTravelDate(expr: Expression): string {
    if (!expr.travelYear) return "";
    let d = String(expr.travelYear);
    if (expr.travelMonth) {
      d += `-${String(expr.travelMonth).padStart(2, "0")}`;
      if (expr.travelDay) d += `-${String(expr.travelDay).padStart(2, "0")}`;
    }
    return d;
  }

  let showDeleteConfirm = $state(false);
  let deleteFormEl = $state<HTMLFormElement>();

  const formResult = $derived(form as FormResult);

  $effect(() => {
    if (formResult?.success) {
      resetAddForm();
    }
  });
</script>

<svelte:head>
  <title>{routeInterest.originCity} &rarr; {routeInterest.destinationCity} - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/route-interests"
    backLabel="Route Interests"
    title="{routeInterest.originCity}, {routeInterest.originCountry} → {routeInterest.destinationCity}, {routeInterest.destinationCountry}"
  />

  {#if formResult?.error}
    <AlertBanner type="error" message={formResult.error} />
  {/if}
  {#if formResult?.success}
    <AlertBanner type="success" message="Expression added." />
  {/if}

  <!-- Delete route interest -->
  <div class="mb-6 flex justify-end">
    <button type="button" class="btn-danger text-sm" onclick={() => { showDeleteConfirm = true; }}>
      Delete Route Interest
    </button>
  </div>

  <!-- Expressions -->
  <div class="glass-card p-5">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-text-primary">
        Expressions ({routeInterest.expressions.length})
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
          <label for="frequency" class="block text-sm font-medium text-text-secondary mb-1">Frequency</label>
          <select id="frequency" name="frequency" class="glass-input block w-full px-3 py-2 text-sm">
            <option value="one_time">One-time</option>
            <option value="repeat">Repeat</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1">Travel Date (optional)</label>
          <div class="grid gap-3 grid-cols-3">
            <input name="travelYear" type="number" min="2020" max="2100" placeholder="Year" class="glass-input block w-full px-3 py-2 text-sm" />
            <SearchableSelect
              options={MONTH_OPTIONS}
              name="travelMonth"
              placeholder="Month..."
              emptyOption="None"
              emptyMessage="No match"
            />
            <input name="travelDay" type="number" min="1" max="31" placeholder="Day" class="glass-input block w-full px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label for="notes" class="block text-sm font-medium text-text-secondary mb-1">Notes (optional)</label>
          <textarea
            id="notes" name="notes"
            bind:value={notes}
            rows="2"
            placeholder="Any notes about this expression..."
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

    {#if routeInterest.expressions.length === 0 && !showAddForm}
      <p class="text-text-muted text-sm">No expressions yet.</p>
    {:else}
      <!-- Mobile card view -->
      <div class="sm:hidden space-y-2">
        {#each routeInterest.expressions as expr (expr.id)}
          <div class="p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
            <div class="flex items-center justify-between mb-1">
              <a href="/route-interests/expressions/{expr.id}" class="font-mono text-xs text-accent hover:text-cyan-300">{expr.displayId}</a>
              <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {expr.frequency === 'repeat' ? 'bg-[rgba(168,85,247,0.15)] text-purple-300' : 'bg-glass text-text-secondary'}">
                {expr.frequency === "repeat" ? "Repeat" : "One-time"}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <div>
                {#if expr.humanName}
                  <a href="/humans/{expr.humanId}" class="text-sm font-medium text-accent hover:text-cyan-300">{expr.humanName}</a>
                {:else}
                  <span class="text-sm text-text-muted">Unknown human</span>
                {/if}
                {#if formatTravelDate(expr)}
                  <span class="text-xs text-text-muted ml-2">Travel: {formatTravelDate(expr)}</span>
                {/if}
              </div>
              <form method="POST" action="?/deleteExpression">
                <input type="hidden" name="expressionId" value={expr.id} />
                <button type="submit" class="text-red-400 hover:text-red-300 text-xs">Remove</button>
              </form>
            </div>
            {#if expr.notes}
              <p class="mt-1 text-sm text-text-secondary">{expr.notes}</p>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Desktop table view -->
      <div class="hidden sm:block overflow-x-auto -mx-5">
        <table class="min-w-full">
          <thead class="glass-thead">
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Human</th>
              <th scope="col">Frequency</th>
              <th scope="col">Travel Date</th>
              <th scope="col">Activity</th>
              <th scope="col">Notes</th>
              <th scope="col">Created</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {#each routeInterest.expressions as expr (expr.id)}
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
                  <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {expr.frequency === 'repeat' ? 'bg-[rgba(168,85,247,0.15)] text-purple-300' : 'bg-glass text-text-secondary'}">
                    {expr.frequency === "repeat" ? "Repeat" : "One-time"}
                  </span>
                </td>
                <td class="text-text-muted text-sm">{formatTravelDate(expr) || "\u2014"}</td>
                <td class="text-sm text-text-secondary">{expr.activitySubject ?? "\u2014"}</td>
                <td class="text-sm text-text-secondary max-w-[200px] truncate">{expr.notes ?? "\u2014"}</td>
                <td class="text-text-muted text-sm">{new Date(expr.createdAt).toLocaleDateString()}</td>
                <td>
                  <form method="POST" action="?/deleteExpression">
                    <input type="hidden" name="expressionId" value={expr.id} />
                    <button type="submit" class="text-red-400 hover:text-red-300 text-sm">Remove</button>
                  </form>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden"></form>

<ConfirmDialog
  open={showDeleteConfirm}
  message="Delete this route interest and all its expressions?"
  onConfirm={() => { deleteFormEl?.requestSubmit(); showDeleteConfirm = false; }}
  onCancel={() => { showDeleteConfirm = false; }}
/>
