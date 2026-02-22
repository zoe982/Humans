<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { Search } from "lucide-svelte";
  import { opportunityStageColors } from "$lib/constants/colors";
  import { opportunityStageLabels, OPPORTUNITY_STAGE_OPTIONS } from "$lib/constants/labels";
  import { Button } from "$lib/components/ui/button";

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
    nextActionOwnerName: string | null;
    nextActionDueDate: string | null;
    isOverdue: boolean;
    updatedAt: string | null;
    createdAt: string;
  };

  const opportunities = $derived(data.opportunities as Opportunity[]);
  const colleagues = $derived(data.colleagues as Colleague[]);
  const colleagueOptions = $derived(colleagues.map((c) => ({ value: c.id, label: c.name })));
  const stageFilterOptions = $derived(OPPORTUNITY_STAGE_OPTIONS.map((s) => ({ value: s.value, label: s.label })));

  const paginationBaseUrl = $derived.by(() => {
    const params = new URLSearchParams();
    if (data.q) params.set("q", data.q);
    if (data.stage) params.set("stage", data.stage);
    if (data.ownerId) params.set("ownerId", data.ownerId);
    if (data.overdueOnly) params.set("overdueOnly", "true");
    const qs = params.toString();
    return `/opportunities${qs ? `?${qs}` : ""}`;
  });
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
    { key: "dueDate", label: "Next Action Due" },
    { key: "owner", label: "Owner" },
    { key: "updatedAt", label: "Last Touched" },
  ]}
  deleteAction="?/delete"
  deleteMessage="Are you sure you want to delete this opportunity? This cannot be undone."
  canDelete={data.userRole === "admin"}
  pagination={{ page: data.page, limit: data.limit, total: data.total, baseUrl: paginationBaseUrl }}
>
  {#snippet searchForm()}
    <form method="GET" class="mt-4 mb-6 flex flex-wrap items-end gap-3">
      <div class="relative flex-1 min-w-[200px]">
        <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input type="text" name="q" value={data.q ?? ""} placeholder="Search by ID..." class="glass-input w-full pl-9 pr-3 py-2 text-sm" />
      </div>
      <div class="w-48">
        <SearchableSelect
          options={stageFilterOptions}
          name="stage"
          id="stageFilter"
          value={data.stage ?? ""}
          emptyOption="All Stages"
          placeholder="Filter stage..."
        />
      </div>
      <div class="w-48">
        <SearchableSelect
          options={colleagueOptions}
          name="ownerId"
          id="ownerFilter"
          value={data.ownerId ?? ""}
          emptyOption="All Owners"
          placeholder="Filter owner..."
        />
      </div>
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" name="overdueOnly" value="true" checked={data.overdueOnly} class="rounded border-glass-border" />
        Overdue only
      </label>
      <Button type="submit" size="sm">Search</Button>
      {#if data.q || data.stage || data.ownerId || data.overdueOnly}
        <a href="/opportunities" class="btn-ghost text-sm">Clear</a>
      {/if}
    </form>
  {/snippet}
  {#snippet desktopRow(opp)}
    <td class="font-mono text-sm">
      <a href="/opportunities/{opp.id}" class="text-accent hover:text-[var(--link-hover)]">{opp.displayId}</a>
    </td>
    <td>
      <StatusBadge status={opportunityStageLabels[opp.stage] ?? opp.stage} colorMap={Object.fromEntries(Object.entries(opportunityStageColors).map(([k, v]) => [opportunityStageLabels[k] ?? k, v]))} />
    </td>
    <td class="text-text-secondary text-sm">{opp.primaryHumanName ?? "\u2014"}</td>
    <td class="text-text-secondary text-sm">{opp.passengerSeats}</td>
    <td class="text-text-secondary text-sm">{opp.petSeats}</td>
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
    <td class="text-text-secondary text-sm">{opp.nextActionOwnerName ?? "\u2014"}</td>
    <td class="text-text-muted text-sm">{opp.updatedAt ? new Date(opp.updatedAt).toLocaleDateString() : "\u2014"}</td>
  {/snippet}
  {#snippet mobileCard(opp)}
    <a href="/opportunities/{opp.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{opp.displayId}</span>
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium text-accent">{opp.primaryHumanName ?? "No primary human"}</span>
        <StatusBadge status={opportunityStageLabels[opp.stage] ?? opp.stage} colorMap={Object.fromEntries(Object.entries(opportunityStageColors).map(([k, v]) => [opportunityStageLabels[k] ?? k, v]))} />
      </div>
      <div class="flex items-center gap-3 text-sm text-text-secondary">
        <span>{opp.passengerSeats} pax</span>
        <span>{opp.petSeats} pet{opp.petSeats !== 1 ? "s" : ""}</span>
        {#if opp.isOverdue}
          <span class="glass-badge badge-red text-xs">Overdue</span>
        {/if}
      </div>
    </a>
  {/snippet}
</EntityListPage>
