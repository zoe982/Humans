<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import LeadScoreBadge from "$lib/components/LeadScoreBadge.svelte";
  import { resolve } from "$app/paths";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { SvelteURLSearchParams } from "svelte/reactivity";
  let { data }: { data: PageData } = $props();

  type Score = {
    id: string;
    displayId: string;
    scoreTotal: number;
    scoreFit: number;
    scoreIntent: number;
    scoreEngagement: number;
    scoreNegative: number;
    band: string;
    parentType: string;
    parentId: string;
    parentDisplayId: string | null;
    createdAt: string;
    updatedAt: string;
  };

  const scores = $derived((data.scores ?? []) as Score[]);

  const parentTypeLabels: Record<string, string> = {
    general_lead: "General Lead",
    website_booking_request: "Booking Request",
    route_signup: "Route Signup",
  };

  function parentPath(s: Score): string {
    if (s.parentType === "general_lead") return `/leads/general-leads/${s.parentId}`;
    if (s.parentType === "website_booking_request") return `/leads/website-booking-requests/${s.parentId}`;
    return `/leads/route-signups/${s.parentId}`;
  }

  // Filter state from URL
  const currentBand = $derived($page.url.searchParams.get("band") ?? "");
  const currentParentType = $derived($page.url.searchParams.get("parentType") ?? "");

  function setFilter(key: string, value: string) {
    const params = new SvelteURLSearchParams($page.url.searchParams);
    if (value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page"); // Reset to page 1 on filter change
    const qs = params.toString();
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(`${$page.url.pathname}${qs !== "" ? `?${qs}` : ""}`, { replaceState: true, invalidateAll: true });
  }
</script>

<svelte:head>
  <title>Lead Scores - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Lead Scores"
    breadcrumbs={[
      { label: "Dashboard", href: "/dashboard" },
      { label: "Reports", href: "/reports" },
      { label: "Lead Scores" },
    ]}
  />

  <!-- Filters -->
  <div class="mt-4 flex flex-wrap gap-2">
    <button
      class="glass-badge rounded-full px-3 py-1 text-sm {currentBand === '' ? 'bg-accent-dim text-accent' : 'bg-glass text-text-secondary'}"
      onclick={() => setFilter("band", "")}
    >All Bands</button>
    <button
      class="glass-badge rounded-full px-3 py-1 text-sm {currentBand === 'hot' ? 'bg-red-500/20 text-red-400' : 'bg-glass text-text-secondary'}"
      onclick={() => setFilter("band", "hot")}
    >Hot</button>
    <button
      class="glass-badge rounded-full px-3 py-1 text-sm {currentBand === 'warm' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-glass text-text-secondary'}"
      onclick={() => setFilter("band", "warm")}
    >Warm</button>
    <button
      class="glass-badge rounded-full px-3 py-1 text-sm {currentBand === 'cold' ? 'bg-blue-500/20 text-blue-400' : 'bg-glass text-text-secondary'}"
      onclick={() => setFilter("band", "cold")}
    >Cold</button>

    <span class="mx-2 border-l border-glass-border"></span>

    <button
      class="glass-badge rounded-full px-3 py-1 text-sm {currentParentType === '' ? 'bg-accent-dim text-accent' : 'bg-glass text-text-secondary'}"
      onclick={() => setFilter("parentType", "")}
    >All Types</button>
    <button
      class="glass-badge rounded-full px-3 py-1 text-sm {currentParentType === 'general_lead' ? 'bg-accent-dim text-accent' : 'bg-glass text-text-secondary'}"
      onclick={() => setFilter("parentType", "general_lead")}
    >General Leads</button>
    <button
      class="glass-badge rounded-full px-3 py-1 text-sm {currentParentType === 'website_booking_request' ? 'bg-accent-dim text-accent' : 'bg-glass text-text-secondary'}"
      onclick={() => setFilter("parentType", "website_booking_request")}
    >Booking Requests</button>
    <button
      class="glass-badge rounded-full px-3 py-1 text-sm {currentParentType === 'route_signup' ? 'bg-accent-dim text-accent' : 'bg-glass text-text-secondary'}"
      onclick={() => setFilter("parentType", "route_signup")}
    >Route Signups</button>
  </div>

  <!-- Table -->
  <div class="mt-6 overflow-x-auto">
    <table class="w-full">
      <thead>
        <tr class="border-b border-glass-border text-left text-sm text-text-muted">
          <th class="pb-3 pr-4 font-medium">Display ID</th>
          <th class="pb-3 pr-4 font-medium">Parent</th>
          <th class="pb-3 pr-4 font-medium">Type</th>
          <th class="pb-3 pr-4 font-medium">Band</th>
          <th class="pb-3 pr-4 font-medium">Score</th>
          <th class="pb-3 pr-4 font-medium">Fit</th>
          <th class="pb-3 pr-4 font-medium">Intent</th>
          <th class="pb-3 pr-4 font-medium">Engage</th>
          <th class="pb-3 pr-4 font-medium">Neg</th>
          <th class="pb-3 font-medium">Updated</th>
        </tr>
      </thead>
      <tbody>
        {#each scores as score, i (i)}
          <tr
            class="border-b border-glass-border/50 glass-row-hover cursor-pointer"
            onclick={() => goto(resolve(`/reports/lead-scores/${score.id}`))}
          >
            <td class="py-3 pr-4 whitespace-nowrap">
              <a href={resolve(`/reports/lead-scores/${score.id}`)} class="text-accent hover:underline font-mono text-sm">
                {score.displayId}
              </a>
            </td>
            <td class="py-3 pr-4">
              <a href={resolve(parentPath(score))} class="text-accent hover:underline font-mono text-sm" onclick={(e) => e.stopPropagation()}>
                {score.parentDisplayId ?? score.parentId.slice(0, 8) + "..."}
              </a>
            </td>
            <td class="py-3 pr-4">
              <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-secondary">
                {parentTypeLabels[score.parentType] ?? score.parentType}
              </span>
            </td>
            <td class="py-3 pr-4">
              <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize {score.band === 'hot' ? 'bg-red-500/20 text-red-400' : score.band === 'warm' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}">
                {score.band}
              </span>
            </td>
            <td class="py-3 pr-4">
              <LeadScoreBadge score={score.scoreTotal} band={score.band} />
            </td>
            <td class="py-3 pr-4 text-sm text-text-secondary">{score.scoreFit}</td>
            <td class="py-3 pr-4 text-sm text-text-secondary">{score.scoreIntent}</td>
            <td class="py-3 pr-4 text-sm text-text-secondary">{score.scoreEngagement}</td>
            <td class="py-3 pr-4 text-sm text-text-secondary">-{score.scoreNegative}</td>
            <td class="py-3 text-sm text-text-muted">
              {score.updatedAt != null ? new Date(score.updatedAt).toLocaleDateString() : "—"}
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="10" class="py-12 text-center text-text-muted">No lead scores found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
