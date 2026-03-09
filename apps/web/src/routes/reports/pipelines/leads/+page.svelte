<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PipelineToggle from "$lib/components/pipeline/PipelineToggle.svelte";
  import PipelineTable from "$lib/components/pipeline/PipelineTable.svelte";
  import { leadPipelineStatusLabels } from "$lib/constants/labels";
  import { leadPipelineStatusColors } from "$lib/constants/colors";
  import { leadTypeLabels } from "$lib/constants/labels";
  import { leadTypeColors } from "$lib/constants/colors";
  import { formatDate } from "$lib/utils/format";
  import { resolve } from "$app/paths";

  let { data }: { data: PageData } = $props();

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------

  type Lead = {
    id: string;
    displayId: string;
    leadType: string;
    status: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    nextAction: {
      type: string | null;
      description: string | null;
      dueDate: string | null;
      ownerName: string | null;
    } | null;
    isOverdue: boolean;
    lastActivityDate: string | null;
    [key: string]: unknown;
  };

  // ---------------------------------------------------------------------------
  // Pipeline status ordering
  // ---------------------------------------------------------------------------

  const PIPELINE_STATUSES = ["open", "pending_response", "qualified"] as const;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let viewMode: "table" | "kanban" = $state("table");

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const leads = $derived((data.leads ?? []) as Lead[]);

  const groups = $derived(
    PIPELINE_STATUSES.map((status) => ({
      stage: status,
      // eslint-disable-next-line security/detect-object-injection
      label: leadPipelineStatusLabels[status] ?? status,
      // eslint-disable-next-line security/detect-object-injection
      color: leadPipelineStatusColors[status] ?? "badge-blue",
      items: leads.filter((lead) => lead.status === status),
    })),
  );

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function getDetailUrl(lead: Lead): string {
    const entityId = lead.id.split(":")[1];
    const routes: Record<string, string> = {
      general_lead: `/leads/general-leads/${entityId}`,
      route_signup: `/leads/route-signups/${entityId}`,
      website_booking_request: `/leads/website-booking-requests/${entityId}`,
      evacuation_lead: `/leads/evacuation-leads/${entityId}`,
    };
    // eslint-disable-next-line security/detect-object-injection
    return routes[lead.leadType] ?? "#";
  }

  function nextActionTypeIcon(type: string | null): string {
    const icons: Record<string, string> = {
      email: "\u2709",
      whatsapp_message: "\uD83D\uDCAC",
      phone_call: "\uD83D\uDCDE",
      online_meeting: "\uD83D\uDDA5",
      social_message: "\uD83D\uDCAC",
    };
    if (type == null) return "";
    // eslint-disable-next-line security/detect-object-injection
    return icons[type] ?? "";
  }

  function leadName(lead: Lead): string {
    return `${lead.firstName} ${lead.lastName}`.trim();
  }
</script>

<svelte:head>
  <title>Leads Pipeline - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Leads Pipeline"
    breadcrumbs={[
      { label: "Dashboard", href: "/dashboard" },
      { label: "Reports", href: "/reports" },
      { label: "Pipelines", href: "/reports/pipelines" },
      { label: "Leads" },
    ]}
  />

  <!-- View toggle -->
  <div class="mt-4 flex items-center justify-between">
    <p class="text-sm text-text-secondary">
      {leads.length} active {leads.length === 1 ? "lead" : "leads"}
    </p>
    <PipelineToggle {viewMode} onchange={(mode) => { viewMode = mode; }} />
  </div>

  <!-- Table view -->
  {#if viewMode === "table"}
    <div class="mt-6 overflow-x-auto">
      <PipelineTable {groups}>
        {#snippet header()}
          <th class="text-left whitespace-nowrap">Display ID</th>
          <th class="text-left">Name</th>
          <th class="text-left whitespace-nowrap">Lead Type</th>
          <th class="text-left">Next Action</th>
          <th class="text-left whitespace-nowrap">Due Date</th>
          <th class="text-left whitespace-nowrap">NA Owner</th>
          <th class="text-left whitespace-nowrap">Last Activity</th>
        {/snippet}
        {#snippet row(item)}
          {@const lead = item as Lead}
          <td class="py-3 pr-4 whitespace-nowrap">
            <a
              href={resolve(getDetailUrl(lead))}
              class="text-accent hover:underline font-mono text-sm"
            >
              {lead.displayId}
            </a>
          </td>
          <td class="py-3 pr-4 text-sm text-text-primary">
            {leadName(lead)}
          </td>
          <td class="py-3 pr-4 whitespace-nowrap">
            <span class="glass-badge {leadTypeColors[lead.leadType] ?? 'badge-blue'} text-xs">
              {leadTypeLabels[lead.leadType] ?? lead.leadType}
            </span>
          </td>
          <td class="py-3 pr-4 text-sm text-text-secondary" style="max-width: 28rem;">
            {#if lead.nextAction?.description != null}
              <span class="leading-snug">{nextActionTypeIcon(lead.nextAction.type)}&nbsp;{lead.nextAction.description}</span>
            {:else}
              <span class="text-text-muted">—</span>
            {/if}
          </td>
          <td class="py-3 pr-4 whitespace-nowrap">
            {#if lead.nextAction?.dueDate != null}
              {#if lead.isOverdue}
                <span class="glass-badge badge-red text-xs">{formatDate(lead.nextAction.dueDate)}</span>
              {:else}
                <span class="text-sm text-text-secondary">{formatDate(lead.nextAction.dueDate)}</span>
              {/if}
            {:else}
              <span class="text-text-muted text-sm">—</span>
            {/if}
          </td>
          <td class="py-3 pr-4 text-sm text-text-secondary whitespace-nowrap">
            {lead.nextAction?.ownerName ?? "—"}
          </td>
          <td class="py-3 text-sm text-text-muted whitespace-nowrap">
            {lead.lastActivityDate != null ? formatDate(lead.lastActivityDate) : "—"}
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
          <!-- Collapsed empty column -->
          <div
            class="glass-card flex-none w-9 flex flex-col items-center py-4 gap-3 cursor-default select-none"
            style="min-height: 10rem;"
            data-stage={group.stage}
            title="{group.label} — no leads"
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
          <!-- Populated column -->
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
              {#each group.items as item, ii (ii)}
                {@const lead = item as Lead}
                <a
                  href={resolve(getDetailUrl(lead))}
                  class="block rounded-lg px-2.5 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.20)] transition-all duration-200 group"
                  style="box-shadow: inset 0 1px 0 rgba(255,255,255,0.10);"
                >
                  <!-- Top row: display ID + name -->
                  <div class="flex items-baseline justify-between gap-1.5 mb-1">
                    <div class="flex items-baseline gap-1.5 min-w-0">
                      <span class="font-mono text-[11px] text-accent group-hover:underline shrink-0">{lead.displayId}</span>
                      <span class="text-sm font-semibold text-text-primary truncate">{leadName(lead)}</span>
                    </div>
                    <span class="glass-badge {leadTypeColors[lead.leadType] ?? 'badge-blue'} text-[10px] shrink-0">
                      {leadTypeLabels[lead.leadType] ?? lead.leadType}
                    </span>
                  </div>

                  <!-- Next action block -->
                  {#if lead.nextAction?.description != null}
                    <div
                      class="rounded px-2 py-1.5 mb-1.5"
                      style="background: rgba(6,182,212,0.07); border: 1px solid rgba(6,182,212,0.18);"
                    >
                      <p class="text-[13px] text-text-primary leading-snug" style="word-break: break-word;">
                        {#if lead.nextAction.type != null}<span class="text-accent">{nextActionTypeIcon(lead.nextAction.type)}</span>{/if}
                        {lead.nextAction.description}
                      </p>
                    </div>
                  {:else}
                    <div class="rounded px-2 py-1 mb-1.5 text-[11px] text-text-muted italic" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
                      No next action set
                    </div>
                  {/if}

                  <!-- Footer: due date + NA owner -->
                  <div class="flex items-center justify-between gap-1.5 text-[11px]">
                    {#if lead.nextAction?.dueDate != null}
                      {#if lead.isOverdue}
                        <span class="glass-badge badge-red text-[11px] py-0">{formatDate(lead.nextAction.dueDate)}</span>
                      {:else}
                        <span class="text-text-secondary">{formatDate(lead.nextAction.dueDate)}</span>
                      {/if}
                    {:else}
                      <span class="text-text-muted">—</span>
                    {/if}
                    {#if lead.nextAction?.ownerName != null}
                      <span class="text-text-muted truncate">{lead.nextAction.ownerName}</span>
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
