<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PipelineToggle from "$lib/components/pipeline/PipelineToggle.svelte";
  import PipelineTable from "$lib/components/pipeline/PipelineTable.svelte";
  import PipelineKanban from "$lib/components/pipeline/PipelineKanban.svelte";
  import { opportunityStageLabels } from "$lib/constants/labels";
  import { opportunityStageColors } from "$lib/constants/colors";
  import { formatDate } from "$lib/utils/format";
  import { resolve } from "$app/paths";

  let { data }: { data: PageData } = $props();

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------

  type Opportunity = {
    id: string;
    displayId: string;
    stage: string;
    primaryHumanName: string | null;
    primaryHuman: { id: string; displayId: string; firstName: string; lastName: string } | null;
    linkedHumanCount: number;
    linkedPetCount: number;
    nextActionDescription: string | null;
    nextActionType: string | null;
    nextActionDueDate: string | null;
    isOverdue: boolean;
    lastActivityDate: string | null;
    [key: string]: unknown;
  };

  // ---------------------------------------------------------------------------
  // Pipeline stage ordering (terminal stages are excluded by the server loader)
  // ---------------------------------------------------------------------------

  const PIPELINE_STAGES = [
    "open",
    "qualified",
    "deposit_request_sent",
    "deposit_received",
    "group_forming",
    "confirmed_to_operate",
    "paid",
    "docs_in_progress",
    "docs_complete",
  ] as const;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let viewMode: "table" | "kanban" = $state("table");

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const opportunities = $derived((data.opportunities ?? []) as Opportunity[]);

  const groups = $derived(
    PIPELINE_STAGES.map((stage) => ({
      stage,
      // eslint-disable-next-line security/detect-object-injection
      label: opportunityStageLabels[stage] ?? stage,
      // eslint-disable-next-line security/detect-object-injection
      color: opportunityStageColors[stage] ?? "badge-blue",
      items: opportunities.filter((opp) => opp.stage === stage),
    })),
  );

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function humanCountLabel(opp: Opportunity): string {
    if (opp.linkedHumanCount <= 1) return opp.primaryHumanName ?? "—";
    const extra = opp.linkedHumanCount - 1;
    return `${opp.primaryHumanName ?? "—"} +${extra.toString()}`;
  }

  function nextActionTypeIcon(type: string | null): string {
    const icons: Record<string, string> = {
      email: "✉",
      whatsapp_message: "💬",
      phone_call: "📞",
      online_meeting: "🖥",
      social_message: "💬",
    };
    if (type == null) return "";
    // eslint-disable-next-line security/detect-object-injection
    return icons[type] ?? "";
  }
</script>

<svelte:head>
  <title>Opportunities Pipeline - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Opportunities Pipeline"
    breadcrumbs={[
      { label: "Dashboard", href: "/dashboard" },
      { label: "Reports", href: "/reports" },
      { label: "Pipelines", href: "/reports/pipelines" },
      { label: "Opportunities" },
    ]}
  />

  <!-- View toggle -->
  <div class="mt-4 flex items-center justify-between">
    <p class="text-sm text-text-secondary">
      {opportunities.length} active {opportunities.length === 1 ? "opportunity" : "opportunities"}
    </p>
    <PipelineToggle {viewMode} onchange={(mode) => { viewMode = mode; }} />
  </div>

  <!-- Table view -->
  {#if viewMode === "table"}
    <div class="mt-6 overflow-x-auto">
      <PipelineTable {groups}>
        {#snippet header()}
          <th class="text-left whitespace-nowrap">Display ID</th>
          <th class="text-left">Primary Human</th>
          <th class="text-left">Humans</th>
          <th class="text-left">Pets</th>
          <th class="text-left">Next Action</th>
          <th class="text-left">Due Date</th>
          <th class="text-left">Last Touch</th>
        {/snippet}
        {#snippet row(item)}
          {@const opp = item as Opportunity}
          <td class="py-3 pr-4 whitespace-nowrap">
            <a
              href={resolve(`/opportunities/${opp.id}`)}
              class="text-accent hover:underline font-mono text-sm"
            >
              {opp.displayId}
            </a>
          </td>
          <td class="py-3 pr-4">
            {#if opp.primaryHuman != null}
              <a
                href={resolve(`/humans/${opp.primaryHuman.id}`)}
                class="text-accent hover:underline text-sm"
              >
                {opp.primaryHumanName ?? `${opp.primaryHuman.firstName} ${opp.primaryHuman.lastName}`}
              </a>
            {:else if opp.primaryHumanName != null}
              <span class="text-sm text-text-secondary">{opp.primaryHumanName}</span>
            {:else}
              <span class="text-text-muted text-sm">—</span>
            {/if}
          </td>
          <td class="py-3 pr-4 text-sm text-text-secondary">
            {humanCountLabel(opp)}
          </td>
          <td class="py-3 pr-4 text-sm text-text-secondary">
            {opp.linkedPetCount}
          </td>
          <td class="py-3 pr-4 text-sm text-text-secondary">
            {#if opp.nextActionDescription != null}
              <span>{nextActionTypeIcon(opp.nextActionType)}&nbsp;{opp.nextActionDescription}</span>
            {:else}
              <span class="text-text-muted">—</span>
            {/if}
          </td>
          <td class="py-3 pr-4 text-sm text-text-secondary">
            {#if opp.nextActionDueDate != null}
              {#if opp.isOverdue}
                <span class="glass-badge badge-red text-xs">{formatDate(opp.nextActionDueDate)}</span>
              {:else}
                {formatDate(opp.nextActionDueDate)}
              {/if}
            {:else}
              <span class="text-text-muted">—</span>
            {/if}
          </td>
          <td class="py-3 text-sm text-text-muted">
            {opp.lastActivityDate != null ? formatDate(opp.lastActivityDate) : "—"}
          </td>
        {/snippet}
      </PipelineTable>
    </div>
  {/if}

  <!-- Kanban view -->
  {#if viewMode === "kanban"}
    <div class="mt-6">
      <PipelineKanban {groups}>
        {#snippet card(item)}
          {@const opp = item as Opportunity}
          <a
            href={resolve(`/opportunities/${opp.id}`)}
            class="block rounded-lg p-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.11)] hover:border-[rgba(255,255,255,0.18)] transition-all duration-150"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="font-mono text-xs text-text-muted">{opp.displayId}</span>
            </div>
            <div class="mt-1 text-sm font-medium text-text-primary truncate">
              {opp.primaryHumanName ?? "—"}
            </div>
            {#if opp.nextActionDescription != null}
              <div class="mt-1.5 text-xs text-text-secondary truncate">
                {nextActionTypeIcon(opp.nextActionType)}&nbsp;{opp.nextActionDescription}
              </div>
            {/if}
            {#if opp.nextActionDueDate != null}
              <div class="mt-2 text-xs {opp.isOverdue ? 'text-red-500 font-medium' : 'text-text-muted'}">
                Due: {formatDate(opp.nextActionDueDate)}
              </div>
            {/if}
          </a>
        {/snippet}
      </PipelineKanban>
    </div>
  {/if}
</div>
