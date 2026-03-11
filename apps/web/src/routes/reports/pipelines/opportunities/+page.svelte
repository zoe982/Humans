<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PipelineToggle from "$lib/components/pipeline/PipelineToggle.svelte";
  import PipelineTable from "$lib/components/pipeline/PipelineTable.svelte";
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
    nextActionOwnerName: string | null;
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
    "deposit_requested",
    "deposit_received",
    "group_forming",
    "flight_confirmed",
    "final_payment_requested",
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
          <th class="text-left whitespace-nowrap">Humans / Pets</th>
          <th class="text-left">Next Action</th>
          <th class="text-left whitespace-nowrap">Due Date</th>
          <th class="text-left whitespace-nowrap">NA Owner</th>
          <th class="text-left whitespace-nowrap">Last Touch</th>
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
          <td class="py-3 pr-4 text-sm text-text-secondary whitespace-nowrap">
            <span title="{opp.linkedHumanCount} human{opp.linkedHumanCount === 1 ? '' : 's'}">
              {opp.linkedHumanCount} human{opp.linkedHumanCount === 1 ? "" : "s"}
            </span>
            {#if opp.linkedPetCount > 0}
              <span class="text-text-muted"> · {opp.linkedPetCount} pet{opp.linkedPetCount === 1 ? "" : "s"}</span>
            {/if}
          </td>
          <td class="py-3 pr-4 text-sm text-text-secondary" style="max-width: 28rem;">
            {#if opp.nextActionDescription != null}
              <span class="leading-snug">{nextActionTypeIcon(opp.nextActionType)}&nbsp;{opp.nextActionDescription}</span>
            {:else}
              <span class="text-text-muted">—</span>
            {/if}
          </td>
          <td class="py-3 pr-4 whitespace-nowrap">
            {#if opp.nextActionDueDate != null}
              {#if opp.isOverdue}
                <span class="glass-badge badge-red text-xs">{formatDate(opp.nextActionDueDate)}</span>
              {:else}
                <span class="text-sm text-text-secondary">{formatDate(opp.nextActionDueDate)}</span>
              {/if}
            {:else}
              <span class="text-text-muted text-sm">—</span>
            {/if}
          </td>
          <td class="py-3 pr-4 text-sm text-text-secondary whitespace-nowrap">
            {opp.nextActionOwnerName ?? "—"}
          </td>
          <td class="py-3 text-sm text-text-muted whitespace-nowrap">
            {opp.lastActivityDate != null ? formatDate(opp.lastActivityDate) : "—"}
          </td>
        {/snippet}
      </PipelineTable>
    </div>
  {/if}

  <!-- Kanban view — inline implementation for adaptive column widths -->
  {#if viewMode === "kanban"}
    <div class="mt-6 flex gap-2 overflow-x-auto pb-4 items-start">
      {#each groups as group, gi (gi)}
        {@const isEmpty = group.items.length === 0}
        {#if isEmpty}
          <!-- Collapsed empty column: narrow vertical strip -->
          <div
            class="glass-card flex-none w-9 flex flex-col items-center py-4 gap-3 cursor-default select-none"
            style="min-height: 10rem;"
            data-stage={group.stage}
            title="{group.label} — no opportunities"
          >
            <span
              class="glass-badge {group.color} text-xs px-1.5 py-0.5"
              style="writing-mode: vertical-rl; transform: rotate(180deg); letter-spacing: 0.04em;"
            >
              {group.label}
            </span>
            <span class="text-xs text-text-muted" style="writing-mode: vertical-rl; transform: rotate(180deg);">0</span>
          </div>
        {:else}
          <!-- Populated column: wider, grows with content -->
          <div
            class="glass-card flex-none flex flex-col"
            style="width: clamp(20rem, 22vw, 26rem);"
            data-stage={group.stage}
          >
            <!-- Column header -->
            <div class="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-[rgba(255,255,255,0.12)]">
              <span class="glass-badge {group.color} text-xs">{group.label}</span>
              <span class="text-xs font-medium tabular-nums text-text-muted">{group.items.length}</span>
            </div>
            <!-- Cards -->
            <div class="flex flex-col gap-1.5 p-2">
              {#each group.items as opp, ii (ii)}
                {@const opportunity = opp as Opportunity}
                <a
                  href={resolve(`/opportunities/${opportunity.id}`)}
                  class="block rounded-lg px-2.5 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.20)] transition-all duration-200 group"
                  style="box-shadow: inset 0 1px 0 rgba(255,255,255,0.10);"
                >
                  <!-- Top row: display ID + human name + counts -->
                  <div class="flex items-baseline justify-between gap-1.5 mb-1">
                    <div class="flex items-baseline gap-1.5 min-w-0">
                      <span class="font-mono text-[11px] text-accent group-hover:underline shrink-0">{opportunity.displayId}</span>
                      <span class="text-sm font-semibold text-text-primary truncate">{opportunity.primaryHumanName ?? "—"}</span>
                    </div>
                    <span class="text-[11px] text-text-muted tabular-nums shrink-0">
                      {opportunity.linkedHumanCount}{#if opportunity.linkedPetCount > 0}/{opportunity.linkedPetCount}{/if}
                    </span>
                  </div>

                  <!-- Next action block — compact -->
                  {#if opportunity.nextActionDescription != null}
                    <div
                      class="rounded px-2 py-1.5 mb-1.5"
                      style="background: rgba(6,182,212,0.07); border: 1px solid rgba(6,182,212,0.18);"
                    >
                      <p class="text-[13px] text-text-primary leading-snug" style="word-break: break-word;">
                        {#if opportunity.nextActionType != null}<span class="text-accent">{nextActionTypeIcon(opportunity.nextActionType)}</span>{/if}
                        {opportunity.nextActionDescription}
                      </p>
                    </div>
                  {:else}
                    <div class="rounded px-2 py-1 mb-1.5 text-[11px] text-text-muted italic" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
                      No next action set
                    </div>
                  {/if}

                  <!-- Footer: due date + NA owner -->
                  <div class="flex items-center justify-between gap-1.5 text-[11px]">
                    {#if opportunity.nextActionDueDate != null}
                      {#if opportunity.isOverdue}
                        <span class="glass-badge badge-red text-[11px] py-0">{formatDate(opportunity.nextActionDueDate)}</span>
                      {:else}
                        <span class="text-text-secondary">{formatDate(opportunity.nextActionDueDate)}</span>
                      {/if}
                    {:else}
                      <span class="text-text-muted">—</span>
                    {/if}
                    {#if opportunity.nextActionOwnerName != null}
                      <span class="text-text-muted truncate">{opportunity.nextActionOwnerName}</span>
                    {/if}
                  </div>
                </a>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>
