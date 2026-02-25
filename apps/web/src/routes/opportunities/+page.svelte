<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { opportunityStageColors } from "$lib/constants/colors";
  import { opportunityStageLabels, OPPORTUNITY_STAGE_OPTIONS } from "$lib/constants/labels";
  import { resolve } from "$app/paths";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Colleague = { id: string; name: string };
  type Opportunity = {
    id: string;
    displayId: string;
    stage: string;
    seatsRequested: number;
    passengerSeats: number;
    petSeats: number;
    primaryHumanName: string | null;
    ownerId: string | null;
    ownerName: string | null;
    ownerDisplayId: string | null;
    nextActionDescription: string | null;
    nextActionOwnerName: string | null;
    nextActionOwnerId: string | null;
    nextActionDueDate: string | null;
    isOverdue: boolean;
    updatedAt: string | null;
    createdAt: string;
  };

  const allOpportunities = $derived(data.opportunities as Opportunity[]);
  const colleagues = $derived(data.colleagues as Colleague[]);
  const colleagueOptions = $derived(colleagues.map((c) => ({ value: c.id, label: c.name })));
  const stageFilterOptions = $derived(OPPORTUNITY_STAGE_OPTIONS.map((s) => ({ value: s.value, label: s.label })));

  // eslint-disable-next-line security/detect-object-injection
  const stageColorMap = $derived(Object.fromEntries(Object.entries(opportunityStageColors).map(([k, v]) => [opportunityStageLabels[k] ?? k, v])));

  let filterStage = $state("");
  let filterOwnerId = $state("");
  let filterDealOwnerId = $state("");
  let filterOverdueOnly = $state(false);
  let filterQ = $state("");

  const opportunities = $derived(
    allOpportunities.filter((opp) => {
      if (filterStage && opp.stage !== filterStage) return false;
      if (filterOwnerId && opp.ownerId !== filterOwnerId) return false;
      if (filterDealOwnerId && opp.ownerId !== filterDealOwnerId) return false;
      if (filterOverdueOnly && !opp.isOverdue) return false;
      if (filterQ) {
        const q = filterQ.trim().toLowerCase();
        const text = [opp.displayId, opp.primaryHumanName, opp.ownerName, opp.nextActionDescription]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    }),
  );

  const hasActiveFilters = $derived(!!(filterStage || filterOwnerId || filterDealOwnerId || filterOverdueOnly || filterQ));
</script>

<EntityListPage
  title="Opportunities"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Opportunities" }]}
  newHref="/opportunities/new"
  newLabel="New Opportunity"
  items={opportunities}
  error={form?.error}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "stage", label: "Stage" },
    { key: "primaryHuman", label: "Primary Human" },
    { key: "pax", label: "Pax" },
    { key: "pets", label: "Pets" },
    { key: "nextAction", label: "Next Action" },
    { key: "dueDate", label: "Due" },
    { key: "naOwner", label: "NA Owner" },
    { key: "owner", label: "Owner" },
    { key: "updatedAt", label: "Last Touched" },
  ]}
  clientPageSize={25}
  deleteAction="?/delete"
  deleteMessage="Are you sure you want to delete this opportunity? This cannot be undone."
  canDelete={data.userRole === "admin"}
>
  {#snippet searchForm()}
    <div class="mt-4 mb-6 flex flex-wrap items-end gap-3">
      <div class="relative flex-1 min-w-[200px]">
        <input type="text" bind:value={filterQ} placeholder="Search by ID or human..." class="glass-input w-full px-3 py-2 text-sm" />
      </div>
      <div class="w-48">
        <SearchableSelect
          options={stageFilterOptions}
          name="stage"
          id="stageFilter"
          value={filterStage}
          emptyOption="All Stages"
          placeholder="Filter stage..."
          onSelect={(val) => { filterStage = val; }}
        />
      </div>
      <div class="w-48">
        <SearchableSelect
          options={colleagueOptions}
          name="dealOwnerId"
          id="dealOwnerFilter"
          value={filterDealOwnerId}
          emptyOption="All Owners"
          placeholder="Filter owner..."
          onSelect={(val) => { filterDealOwnerId = val; }}
        />
      </div>
      <div class="w-48">
        <SearchableSelect
          options={colleagueOptions}
          name="ownerId"
          id="ownerFilter"
          value={filterOwnerId}
          emptyOption="All NA Owners"
          placeholder="Filter NA owner..."
          onSelect={(val) => { filterOwnerId = val; }}
        />
      </div>
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" bind:checked={filterOverdueOnly} class="rounded border-glass-border" />
        Overdue only
      </label>
      {#if hasActiveFilters}
        <button type="button" class="btn-ghost text-sm" onclick={() => { filterStage = ""; filterOwnerId = ""; filterDealOwnerId = ""; filterOverdueOnly = false; filterQ = ""; }}>Clear</button>
      {/if}
    </div>
  {/snippet}
  {#snippet desktopRow(opp)}
    <td class="font-mono text-sm whitespace-nowrap">
      <a href={resolve(`/opportunities/${opp.id}`)} class="text-accent hover:text-[var(--link-hover)]">{opp.displayId}</a>
    </td>
    <td>
      <!-- eslint-disable-next-line security/detect-object-injection -->
      <StatusBadge status={opportunityStageLabels[opp.stage] ?? opp.stage} colorMap={stageColorMap} />
    </td>
    <td class="text-text-secondary text-sm">{opp.primaryHumanName ?? "\u2014"}</td>
    <td class="text-text-secondary text-sm">{opp.passengerSeats}</td>
    <td class="text-text-secondary text-sm">{opp.petSeats}</td>
    <td class="text-sm max-w-[200px] truncate">
      {#if opp.nextActionDescription}
        <span class="text-text-secondary">{opp.nextActionDescription}</span>
      {:else}
        <span class="text-text-muted italic">Not set</span>
      {/if}
    </td>
    <td class="text-sm whitespace-nowrap">
      {#if opp.nextActionDueDate}
        <span class={opp.isOverdue ? "text-red-400 font-medium" : "text-text-muted"}>
          {new Date(opp.nextActionDueDate).toLocaleDateString()}
        </span>
        {#if opp.isOverdue}
          <span class="glass-badge badge-red text-xs ml-1">Overdue</span>
        {/if}
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
    <td class="text-text-secondary text-sm">{opp.nextActionOwnerName ?? "—"}</td>
    <td class="text-text-secondary text-sm">
      {#if opp.ownerName}
        <span class="font-mono">{opp.ownerDisplayId}</span> — {opp.ownerName}
      {:else}
        —
      {/if}
    </td>
    <td class="text-text-muted text-sm">{opp.updatedAt ? new Date(opp.updatedAt).toLocaleDateString() : "—"}</td>
  {/snippet}
  {#snippet mobileCard(opp)}
    <a href={resolve(`/opportunities/${opp.id}`)} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{opp.displayId}</span>
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium text-accent">{opp.primaryHumanName ?? "No primary human"}</span>
        <!-- eslint-disable-next-line security/detect-object-injection -->
      <StatusBadge status={opportunityStageLabels[opp.stage] ?? opp.stage} colorMap={stageColorMap} />
      </div>
      <div class="flex items-center gap-3 text-sm text-text-secondary">
        <span>{opp.passengerSeats} pax</span>
        <span>{opp.petSeats} pet{opp.petSeats !== 1 ? "s" : ""}</span>
        {#if opp.ownerName}
          <span>{opp.ownerName}</span>
        {/if}
      </div>
      <div class="mt-1 flex items-center gap-2 text-xs text-text-muted">
        {#if opp.nextActionDescription}
          <span class="truncate max-w-[180px]">NA: {opp.nextActionDescription}</span>
          {#if opp.nextActionDueDate}
            <span class={opp.isOverdue ? "text-red-400 font-medium" : ""}>
              {new Date(opp.nextActionDueDate).toLocaleDateString()}
            </span>
          {/if}
          {#if opp.isOverdue}
            <span class="glass-badge badge-red text-xs">Overdue</span>
          {/if}
          {#if opp.nextActionOwnerName}
            <span>({opp.nextActionOwnerName})</span>
          {/if}
        {:else}
          <span class="italic">No next action</span>
        {/if}
      </div>
    </a>
  {/snippet}
</EntityListPage>
