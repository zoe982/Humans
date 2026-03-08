<script lang="ts">
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import LeadScoreBadge from "$lib/components/LeadScoreBadge.svelte";
  import { getLeadScoreBand, generalLeadStatuses, routeSignupStatuses, websiteBookingRequestStatuses, evacuationLeadStatuses } from "@humans/shared";
  import { leadTypeColors, allLeadStatusColors } from "$lib/constants/colors";
  import { leadTypeLabels, allLeadStatusLabels, generalLeadStatusLabels, signupStatusLabels, bookingRequestStatusLabels, evacuationLeadStatusLabels } from "$lib/constants/labels";
  import { resolve } from "$app/paths";
  import { formatDate } from "$lib/utils/format";
  import { api } from "$lib/api";
  import { toast } from "svelte-sonner";
  import { SvelteMap } from "svelte/reactivity";

  let { data }: { data: { allLeads: unknown[]; userRole: string } } = $props();

  type UnifiedLead = {
    id: string;
    displayId: string;
    leadType: "general_lead" | "route_signup" | "website_booking_request" | "evacuation_lead";
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

  // Status overrides for inline editing (since allLeads is $derived, can't mutate directly)
  let statusOverrides = new SvelteMap<string, string>();

  // Status options change based on selected type
  const statusOptions = $derived.by(() => {
    if (filterType === "general_lead") return Object.entries(generalLeadStatusLabels);
    if (filterType === "route_signup") return Object.entries(signupStatusLabels);
    if (filterType === "website_booking_request") return Object.entries(bookingRequestStatusLabels);
    if (filterType === "evacuation_lead") return Object.entries(evacuationLeadStatusLabels);
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
      case "evacuation_lead": return `/leads/evacuation-leads/${originalId}`;
    }
  }

  function isOverdue(dueDate: string | null): boolean {
    if (dueDate == null) return false;
    return new Date(dueDate) < new Date();
  }

  function formatName(lead: UnifiedLead): string {
    return [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ");
  }

  function getEffectiveStatus(lead: UnifiedLead): string {
    return statusOverrides.get(lead.id) ?? lead.status;
  }

  function getStatusOptionsForLead(leadType: UnifiedLead["leadType"]): readonly string[] {
    switch (leadType) {
      case "general_lead": return generalLeadStatuses;
      case "route_signup": return routeSignupStatuses;
      case "website_booking_request": return websiteBookingRequestStatuses;
      case "evacuation_lead": return evacuationLeadStatuses;
    }
  }

  function getStatusLabelsForLead(leadType: UnifiedLead["leadType"]): Record<string, string> {
    switch (leadType) {
      case "general_lead": return generalLeadStatusLabels;
      case "route_signup": return signupStatusLabels;
      case "website_booking_request": return bookingRequestStatusLabels;
      case "evacuation_lead": return evacuationLeadStatusLabels;
    }
  }

  // Maps badge utility names to their CSS variable pairs for inline status selects
  const badgeStyleMap: Record<string, { bg: string; color: string }> = {
    "badge-blue":   { bg: "var(--badge-blue-bg)",   color: "var(--badge-blue-text)" },
    "badge-green":  { bg: "var(--badge-green-bg)",  color: "var(--badge-green-text)" },
    "badge-red":    { bg: "var(--badge-red-bg)",    color: "var(--badge-red-text)" },
    "badge-yellow": { bg: "var(--badge-yellow-bg)", color: "var(--badge-yellow-text)" },
    "badge-purple": { bg: "var(--badge-purple-bg)", color: "var(--badge-purple-text)" },
    "badge-orange": { bg: "var(--badge-orange-bg)", color: "var(--badge-orange-text)" },
    "badge-pink":   { bg: "var(--badge-pink-bg)",   color: "var(--badge-pink-text)" },
  };

  function getStatusBadgeStyle(lead: UnifiedLead): string {
    const effectiveStatus = getEffectiveStatus(lead);
    // eslint-disable-next-line security/detect-object-injection
    const badgeKey = allLeadStatusColors[effectiveStatus];
    // eslint-disable-next-line security/detect-object-injection
    const style = badgeKey ? badgeStyleMap[badgeKey] : null;
    if (!style) return "";
    return `background-color: ${style.bg}; color: ${style.color};`;
  }

  async function handleInlineStatusChange(lead: UnifiedLead, newStatus: string) {
    const originalId = lead.id.split(":").slice(1).join(":");

    // Leads with closed_lost require a loss reason — redirect to detail page
    if ((lead.leadType === "general_lead" || lead.leadType === "evacuation_lead") && newStatus === "closed_lost") {
      toast.info("Loss reason required — please update status on the detail page");
      return;
    }

    const prev = getEffectiveStatus(lead);
    statusOverrides.set(lead.id, newStatus);

    try {
      switch (lead.leadType) {
        case "general_lead":
          await api(`/api/general-leads/${originalId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus }),
          });
          break;
        case "route_signup":
          await api(`/api/route-signups/${originalId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus }),
          });
          break;
        case "website_booking_request":
          await api(`/api/website-booking-requests/${originalId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus }),
          });
          break;
        case "evacuation_lead":
          await api(`/api/evacuation-leads/${originalId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus }),
          });
          break;
      }
      toast.success("Status updated");
    } catch {
      // Revert on failure
      if (prev === lead.status) {
        statusOverrides.delete(lead.id);
      } else {
        statusOverrides.set(lead.id, prev);
      }
      toast.error("Failed to update status");
    }
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
    { key: "createdAt", label: "Created" },
    { key: "name", label: "Name" },
    { key: "channel", label: "Channel" },
    { key: "source", label: "Source" },
    { key: "score", label: "Score" },
    { key: "nextAction", label: "Next Action" },
  ]}
  clientPageSize={100}
  zebraStripe={true}
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
          <option value="evacuation_lead">Evacuation Lead</option>
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
      <a href={resolve(getDetailUrl(lead))} class="font-semibold text-accent hover:text-[var(--link-hover)]">{lead.displayId || "\u2014"}</a>
    </td>
    <td>
      <!-- eslint-disable-next-line security/detect-object-injection -->
      <span class="glass-badge {leadTypeColors[lead.leadType] ?? 'bg-glass text-text-secondary'}">
        <!-- eslint-disable-next-line security/detect-object-injection -->
        {leadTypeLabels[lead.leadType] ?? lead.leadType}
      </span>
    </td>
    <td>
      <select
        class="glass-select-badge"
        style={getStatusBadgeStyle(lead)}
        value={getEffectiveStatus(lead)}
        onchange={(e) => {
          const target = e.currentTarget;
          void handleInlineStatusChange(lead, target.value);
        }}
      >
        {#each getStatusOptionsForLead(lead.leadType) as status, i (i)}
          {@const labels = getStatusLabelsForLead(lead.leadType)}
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <option value={status}>{labels[status] ?? status}</option>
        {/each}
      </select>
    </td>
    <td class="text-text-muted text-sm whitespace-nowrap">{lead.createdAt ? formatDate(lead.createdAt) : "\u2014"}</td>
    <td class="font-semibold text-text-primary text-sm">{formatName(lead)}</td>
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
          <div class="text-xs {isOverdue(lead.nextAction.dueDate) ? 'text-[var(--badge-red-text)]' : 'text-text-muted'}">
            Due {formatDate(lead.nextAction.dueDate)}
          </div>
        {/if}
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
  {/snippet}
  {#snippet mobileCard(lead)}
    <a href={resolve(getDetailUrl(lead))} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <div class="flex items-center gap-2 mb-2">
        <span class="font-mono text-xs text-text-muted">{lead.displayId || "\u2014"}</span>
        <!-- eslint-disable-next-line security/detect-object-injection -->
        <span class="glass-badge {leadTypeColors[lead.leadType] ?? 'bg-glass text-text-secondary'}">
          <!-- eslint-disable-next-line security/detect-object-injection -->
          {leadTypeLabels[lead.leadType] ?? lead.leadType}
        </span>
      </div>
      <div class="flex items-center gap-2 mb-1">
        <!-- eslint-disable-next-line security/detect-object-injection -->
        <span class="glass-badge {allLeadStatusColors[getEffectiveStatus(lead)] ?? 'bg-glass text-text-secondary'}">
          <!-- eslint-disable-next-line security/detect-object-injection -->
          {allLeadStatusLabels[getEffectiveStatus(lead)] ?? getEffectiveStatus(lead)}
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
      <div class="mt-2 text-xs text-text-muted">{lead.createdAt ? formatDate(lead.createdAt) : "\u2014"}</div>
    </a>
  {/snippet}
</EntityListPage>
