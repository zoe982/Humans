<script lang="ts">
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import LeadScoreBadge from "$lib/components/LeadScoreBadge.svelte";
  import { getLeadScoreBand } from "@humans/shared";
  import { leadTypeColors, allLeadStatusColors } from "$lib/constants/colors";
  import { leadTypeLabels, allLeadStatusLabels, generalLeadStatusLabels, signupStatusLabels, bookingRequestStatusLabels } from "$lib/constants/labels";
  import { resolve } from "$app/paths";

  let { data }: { data: { allLeads: unknown[]; userRole: string } } = $props();

  type UnifiedLead = {
    id: string;
    displayId: string;
    leadType: "general_lead" | "route_signup" | "website_booking_request";
    status: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    channel: string | null;
    source: string | null;
    scoreTotal: number | null;
    nextAction: { type: string | null; description: string | null; dueDate: string | null } | null;
    createdAt: string;
  };

  const allLeads = $derived(data.allLeads as UnifiedLead[]);

  let filterType = $state("");
  let filterStatus = $state("");
  let filterQ = $state("");

  // Status options change based on selected type
  const statusOptions = $derived.by(() => {
    if (filterType === "general_lead") return Object.entries(generalLeadStatusLabels);
    if (filterType === "route_signup") return Object.entries(signupStatusLabels);
    if (filterType === "website_booking_request") return Object.entries(bookingRequestStatusLabels);
    return Object.entries(allLeadStatusLabels);
  });

  // Reset status filter when type changes if current status is not valid for new type
  $effect(() => {
    if (filterStatus && !statusOptions.some(([value]) => value === filterStatus)) {
      filterStatus = "";
    }
  });

  const leads = $derived(
    allLeads.filter((lead) => {
      if (filterType && lead.leadType !== filterType) return false;
      if (filterStatus && lead.status !== filterStatus) return false;
      if (filterQ) {
        const q = filterQ.trim().toLowerCase();
        const text = [lead.displayId, lead.firstName, lead.middleName, lead.lastName, lead.channel, lead.source]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    }),
  );

  function getDetailUrl(lead: UnifiedLead): string {
    const originalId = lead.id.split(":").slice(1).join(":");
    switch (lead.leadType) {
      case "general_lead": return `/leads/general-leads/${originalId}`;
      case "route_signup": return `/leads/route-signups/${originalId}`;
      case "website_booking_request": return `/leads/website-booking-requests/${originalId}`;
    }
  }

  function isOverdue(dueDate: string | null): boolean {
    if (dueDate == null) return false;
    return new Date(dueDate) < new Date();
  }

  function formatName(lead: UnifiedLead): string {
    return [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ");
  }
</script>

<EntityListPage
  title="All Leads"
  breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "All Leads" }]}
  items={leads}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "leadType", label: "Type" },
    { key: "status", label: "Status" },
    { key: "name", label: "Name" },
    { key: "channel", label: "Channel" },
    { key: "source", label: "Source" },
    { key: "score", label: "Score" },
    { key: "nextAction", label: "Next Action" },
    { key: "createdAt", label: "Created" },
  ]}
  clientPageSize={25}
  defaultSortKey="createdAt"
  defaultSortDirection="desc"
  canDelete={false}
>
  {#snippet searchForm()}
    <div class="mt-4 mb-6 flex flex-wrap gap-3 items-end">
      <div>
        <label for="type-filter" class="block text-xs font-medium text-text-muted mb-1">Type</label>
        <select id="type-filter" class="glass-input px-3 py-1.5 text-sm" bind:value={filterType}>
          <option value="">All Types</option>
          <option value="general_lead">General Lead</option>
          <option value="route_signup">Route Signup</option>
          <option value="website_booking_request">Booking Request</option>
        </select>
      </div>
      <div>
        <label for="status-filter" class="block text-xs font-medium text-text-muted mb-1">Status</label>
        <select id="status-filter" class="glass-input px-3 py-1.5 text-sm" bind:value={filterStatus}>
          <option value="">All Statuses</option>
          {#each statusOptions as [value, label], i (i)}
            <option {value}>{label}</option>
          {/each}
        </select>
      </div>
      <div class="relative flex-1 min-w-[200px]">
        <label for="q-filter" class="block text-xs font-medium text-text-muted mb-1">Search</label>
        <input id="q-filter" type="text" class="glass-input w-full px-3 py-1.5 text-sm" placeholder="ID, name, channel, source..." bind:value={filterQ} />
      </div>
      {#if filterType || filterStatus || filterQ}
        <button type="button" class="btn-ghost text-sm" onclick={() => { filterType = ""; filterStatus = ""; filterQ = ""; }}>Clear</button>
      {/if}
    </div>
  {/snippet}
  {#snippet desktopRow(lead)}
    <td class="font-mono text-sm whitespace-nowrap">
      <a href={resolve(getDetailUrl(lead))} class="text-accent hover:text-[var(--link-hover)]">{lead.displayId || "\u2014"}</a>
    </td>
    <td>
      <!-- eslint-disable-next-line security/detect-object-injection -->
      <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {leadTypeColors[lead.leadType] ?? 'bg-glass text-text-secondary'}">
        <!-- eslint-disable-next-line security/detect-object-injection -->
        {leadTypeLabels[lead.leadType] ?? lead.leadType}
      </span>
    </td>
    <td>
      <!-- eslint-disable-next-line security/detect-object-injection -->
      <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {allLeadStatusColors[lead.status] ?? 'bg-glass text-text-secondary'}">
        <!-- eslint-disable-next-line security/detect-object-injection -->
        {allLeadStatusLabels[lead.status] ?? lead.status}
      </span>
    </td>
    <td class="text-text-primary text-sm">{formatName(lead)}</td>
    <td class="text-text-secondary text-sm">{lead.channel ?? "\u2014"}</td>
    <td class="text-text-secondary text-sm">{lead.source ?? "\u2014"}</td>
    <td>
      {#if lead.scoreTotal != null}
        <LeadScoreBadge score={lead.scoreTotal} band={getLeadScoreBand(lead.scoreTotal)} />
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
    <td class="text-sm max-w-[200px]">
      {#if lead.nextAction}
        <div class="text-text-primary truncate">
          {#if lead.nextAction.type}{lead.nextAction.type}: {/if}{lead.nextAction.description ?? ""}
        </div>
        {#if lead.nextAction.dueDate}
          <div class="text-xs {isOverdue(lead.nextAction.dueDate) ? 'text-[#fca5a5]' : 'text-text-muted'}">
            Due {new Date(lead.nextAction.dueDate).toLocaleDateString()}
          </div>
        {/if}
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
    <td class="text-text-muted whitespace-nowrap">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "\u2014"}</td>
  {/snippet}
  {#snippet mobileCard(lead)}
    <a href={resolve(getDetailUrl(lead))} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <div class="flex items-center gap-2 mb-2">
        <span class="font-mono text-xs text-text-muted">{lead.displayId || "\u2014"}</span>
        <!-- eslint-disable-next-line security/detect-object-injection -->
        <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {leadTypeColors[lead.leadType] ?? 'bg-glass text-text-secondary'}">
          <!-- eslint-disable-next-line security/detect-object-injection -->
          {leadTypeLabels[lead.leadType] ?? lead.leadType}
        </span>
      </div>
      <div class="flex items-center gap-2 mb-1">
        <!-- eslint-disable-next-line security/detect-object-injection -->
        <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {allLeadStatusColors[lead.status] ?? 'bg-glass text-text-secondary'}">
          <!-- eslint-disable-next-line security/detect-object-injection -->
          {allLeadStatusLabels[lead.status] ?? lead.status}
        </span>
        {#if lead.scoreTotal != null}
          <LeadScoreBadge score={lead.scoreTotal} band={getLeadScoreBand(lead.scoreTotal)} />
        {/if}
      </div>
      <p class="text-sm font-medium text-text-primary">{formatName(lead)}</p>
      {#if lead.channel || lead.source}
        <p class="text-xs text-text-secondary mt-1">
          {#if lead.channel}{lead.channel}{/if}
          {#if lead.channel && lead.source} &middot; {/if}
          {#if lead.source}{lead.source}{/if}
        </p>
      {/if}
      {#if lead.nextAction}
        <p class="text-xs text-text-muted mt-1 truncate">
          Next: {#if lead.nextAction.type}{lead.nextAction.type}: {/if}{lead.nextAction.description ?? ""}
        </p>
      {/if}
      <div class="mt-2 text-xs text-text-muted">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "\u2014"}</div>
    </a>
  {/snippet}
</EntityListPage>
