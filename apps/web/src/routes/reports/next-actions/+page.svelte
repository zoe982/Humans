<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import { formatDate } from "$lib/utils/format";
  import { resolve } from "$app/paths";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { invalidateAll } from "$app/navigation";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  let { data }: { data: PageData } = $props();

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------

  type NextActionItem = {
    entityType: "opportunity" | "general_lead" | "route_signup" | "website_booking_request";
    entityId: string;
    entityDisplayId: string;
    entityLabel: string;
    entityStatus: string;
    description: string;
    type: string | null;
    dueDate: string | null;
    isOverdue: boolean;
    ownerName: string | null;
    ownerId: string | null;
    [key: string]: unknown;
  };

  type Colleague = {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    [key: string]: unknown;
  };

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const nextActions = $derived((data.nextActions ?? []) as NextActionItem[]);
  const colleagues = $derived((data.colleagues ?? []) as Colleague[]);
  const selectedColleagueId = $derived(data.selectedColleagueId ?? "");

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const entityTypeLabels: Record<string, string> = {
    opportunity: "Opportunity",
    general_lead: "General Lead",
    route_signup: "Route Signup",
    website_booking_request: "Booking Request",
  };

  const entityTypeBadgeColors: Record<string, string> = {
    opportunity: "badge-blue",
    general_lead: "badge-green",
    route_signup: "badge-orange",
    website_booking_request: "badge-purple",
  };

  function entityDetailPath(item: NextActionItem): string {
    if (item.entityType === "opportunity") return `/opportunities/${item.entityId}`;
    if (item.entityType === "general_lead") return `/leads/general-leads/${item.entityId}`;
    if (item.entityType === "route_signup") return `/leads/route-signups/${item.entityId}`;
    return `/leads/website-booking-requests/${item.entityId}`;
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

  function entityTypeBadge(entityType: string): string {
    // eslint-disable-next-line security/detect-object-injection
    return entityTypeBadgeColors[entityType] ?? "badge-blue";
  }

  function entityTypeLabel(entityType: string): string {
    // eslint-disable-next-line security/detect-object-injection
    return entityTypeLabels[entityType] ?? entityType;
  }

  // ---------------------------------------------------------------------------
  // Colleague filter
  // ---------------------------------------------------------------------------

  async function onColleagueChange(e: Event): Promise<void> {
    const select = e.target as HTMLSelectElement;
    const value = select.value;
    const params = new SvelteURLSearchParams($page.url.searchParams);
    if (value === "") {
      params.delete("colleagueId");
    } else {
      params.set("colleagueId", value);
    }
    const qs = params.toString();
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    await goto(`${$page.url.pathname}${qs !== "" ? `?${qs}` : ""}`, { replaceState: true });
    await invalidateAll();
  }
</script>

<svelte:head>
  <title>Next Actions - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Next Actions"
    breadcrumbs={[
      { label: "Dashboard", href: "/dashboard" },
      { label: "Reports", href: "/reports" },
      { label: "Next Actions" },
    ]}
  />

  <!-- Colleague filter -->
  <div class="mt-4 flex items-center gap-3">
    <label for="colleague-filter" class="text-sm text-text-secondary whitespace-nowrap">Filter by colleague:</label>
    <select
      id="colleague-filter"
      class="glass-input rounded-lg px-3 py-1.5 text-sm text-text-primary bg-glass border border-glass-border focus:outline-none focus:ring-1 focus:ring-accent"
      value={selectedColleagueId}
      onchange={onColleagueChange}
    >
      <option value="">All Colleagues</option>
      {#each colleagues as colleague, ci (ci)}
        <option value={String(colleague.id)}>{String(colleague.name ?? "")}</option>
      {/each}
    </select>

    <p class="text-sm text-text-secondary ml-auto">
      {nextActions.length} next {nextActions.length === 1 ? "action" : "actions"}
    </p>
  </div>

  <!-- Table -->
  <div class="mt-6 glass-card overflow-x-auto">
    {#if nextActions.length === 0}
      <div class="px-6 py-12 text-center text-text-muted text-sm">
        No pending next actions found.
      </div>
    {:else}
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-glass-border">
            <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Type</th>
            <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Entity</th>
            <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Person / Name</th>
            <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Next Action</th>
            <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Action Type</th>
            <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Due Date</th>
            <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">Owner</th>
          </tr>
        </thead>
        <tbody>
          {#each nextActions as item, i (i)}
            <tr
              class="border-b border-glass-border hover:bg-glass-hover transition-colors {item.isOverdue ? 'bg-[rgba(239,68,68,0.04)]' : ''}"
            >
              <!-- Entity type badge -->
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="glass-badge {entityTypeBadge(item.entityType)} text-xs">
                  {entityTypeLabel(item.entityType)}
                </span>
              </td>

              <!-- Entity display ID + link -->
              <td class="px-4 py-3 whitespace-nowrap">
                <a
                  href={resolve(entityDetailPath(item))}
                  class="text-accent hover:underline font-mono text-sm"
                >
                  {item.entityDisplayId}
                </a>
              </td>

              <!-- Entity label (person name) -->
              <td class="px-4 py-3 text-sm text-text-primary">
                {#if item.entityLabel && item.entityLabel !== item.entityDisplayId}
                  {item.entityLabel}
                {:else}
                  <span class="text-text-muted">—</span>
                {/if}
              </td>

              <!-- Next action description -->
              <td class="px-4 py-3 text-sm text-text-secondary" style="max-width: 28rem;">
                {#if item.description}
                  <span class="leading-snug">{nextActionTypeIcon(item.type)}&nbsp;{item.description}</span>
                {:else}
                  <span class="text-text-muted">—</span>
                {/if}
              </td>

              <!-- Action type -->
              <td class="px-4 py-3 text-sm text-text-muted whitespace-nowrap">
                {item.type ?? "—"}
              </td>

              <!-- Due date -->
              <td class="px-4 py-3 whitespace-nowrap">
                {#if item.dueDate != null}
                  {#if item.isOverdue}
                    <span class="glass-badge badge-red text-xs">{formatDate(item.dueDate)}</span>
                  {:else}
                    <span class="text-sm text-text-secondary">{formatDate(item.dueDate)}</span>
                  {/if}
                {:else}
                  <span class="text-text-muted text-sm">—</span>
                {/if}
              </td>

              <!-- Owner -->
              <td class="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                {item.ownerName ?? "—"}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>
