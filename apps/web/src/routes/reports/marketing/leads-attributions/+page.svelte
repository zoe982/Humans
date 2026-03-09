<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import { leadTypeLabels, allLeadStatusLabels } from "$lib/constants/labels";
  import { leadTypeColors, allLeadStatusColors } from "$lib/constants/colors";
  import { formatDate } from "$lib/utils/format";
  import { resolve } from "$app/paths";

  let { data }: { data: PageData } = $props();

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------

  type Row = {
    id: string;
    displayId: string;
    leadType: string;
    status: string;
    channel: string | null;
    source: string | null;
    createdAt: string;
    gclid: string | null;
    gclidTouch: "LT" | "FT" | null;
    fbclid: string | null;
    fbclidTouch: "LT" | "FT" | null;
    attributionId: string | null;
    [key: string]: unknown;
  };

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const rows = $derived((data.rows ?? []) as Row[]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function getDetailUrl(row: Row): string {
    const entityId = row.id.split(":")[1];
    const routes: Record<string, string> = {
      general_lead: `/leads/general-leads/${entityId}`,
      route_signup: `/leads/route-signups/${entityId}`,
      website_booking_request: `/leads/website-booking-requests/${entityId}`,
      evacuation_lead: `/leads/evacuation-leads/${entityId}`,
    };
    return routes[row.leadType] ?? "#";
  }

  function statusBadgeColor(row: Row): string {
    // BOR + qualified = green badge (special case override)
    if (row.leadType === "website_booking_request" && row.status === "qualified") {
      return "badge-green";
    }
    return allLeadStatusColors[row.status] ?? "badge-blue";
  }
</script>

<svelte:head>
  <title>Leads &amp; Attributions - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Leads & Attributions"
    breadcrumbs={[
      { label: "Dashboard", href: "/dashboard" },
      { label: "Reports", href: "/reports" },
      { label: "Marketing", href: "/reports/marketing" },
      { label: "Leads & Attributions" },
    ]}
  />

  <p class="mt-4 text-sm text-text-secondary">
    {rows.length} {rows.length === 1 ? "lead" : "leads"}
  </p>

  <div class="mt-6 overflow-x-auto">
    <table class="glass-card w-full text-left text-sm">
      <thead>
        <tr class="border-b border-[rgba(255,255,255,0.12)]">
          <th class="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider whitespace-nowrap">Lead ID</th>
          <th class="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Type</th>
          <th class="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
          <th class="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider whitespace-nowrap">Created</th>
          <th class="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Channel</th>
          <th class="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Source</th>
          <th class="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">GCLID</th>
          <th class="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">FBCLID</th>
          <th class="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Attribution</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row, i (i)}
          <tr class="border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.04)]">
            <td class="px-4 py-3 whitespace-nowrap">
              <a
                href={resolve(getDetailUrl(row))}
                class="text-accent hover:underline font-mono text-sm"
              >
                {row.displayId}
              </a>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <span class="glass-badge {leadTypeColors[row.leadType] ?? 'badge-blue'} text-xs">
                {leadTypeLabels[row.leadType] ?? row.leadType}
              </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <span class="glass-badge {statusBadgeColor(row)} text-xs">
                {allLeadStatusLabels[row.status] ?? row.status}
              </span>
            </td>
            <td class="px-4 py-3 text-text-secondary whitespace-nowrap">
              {formatDate(row.createdAt)}
            </td>
            <td class="px-4 py-3 text-text-secondary">
              {row.channel ?? "—"}
            </td>
            <td class="px-4 py-3 text-text-secondary">
              {row.source ?? "—"}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              {#if row.gclid != null}
                <span class="text-text-primary text-xs font-mono">{row.gclid}</span>
                <span class="ml-1 glass-badge badge-yellow text-[10px] py-0 px-1">{row.gclidTouch}</span>
              {:else}
                <span class="text-text-muted">—</span>
              {/if}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              {#if row.fbclid != null}
                <span class="text-text-primary text-xs font-mono">{row.fbclid}</span>
                <span class="ml-1 glass-badge badge-yellow text-[10px] py-0 px-1">{row.fbclidTouch}</span>
              {:else}
                <span class="text-text-muted">—</span>
              {/if}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              {#if row.attributionId != null}
                <a
                  href={resolve(`/marketing-attributions/${row.attributionId}`)}
                  class="text-accent hover:underline text-xs"
                >
                  View
                </a>
              {:else}
                <span class="text-text-muted">—</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
