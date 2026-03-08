<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import LeadScoreBadge from "$lib/components/LeadScoreBadge.svelte";
  import { getLeadScoreBand } from "@humans/shared";
  import { Search } from "lucide-svelte";
  import { evacuationLeadStatusLabels } from "$lib/constants/labels";
  import { evacuationLeadStatusColors } from "$lib/constants/colors";
  import { formatDateTime, formatDate } from "$lib/utils/format";
  import { resolve } from "$app/paths";
  import InlineNoteEditor from "$lib/components/InlineNoteEditor.svelte";
  import { api } from "$lib/api";
  import { toast } from "svelte-sonner";
  import { SvelteMap } from "svelte/reactivity";
  import { browser } from "$app/environment";
  import { getStore } from "$lib/data/stores.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type EvacuationLead = {
    id: string;
    display_id: string | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    interests: unknown;
    status: string | null;
    note: string | null;
    inserted_at: string;
    crm_channel: string | null;
    crm_source: string | null;
    scoreTotal: number | null;
    nextAction: { type: string | null; description: string | null; dueDate: string | null } | null;
  };

  const allLeads = $derived((browser ? getStore<EvacuationLead>("evacuation-leads").items : data.evacuationLeads) as EvacuationLead[]);

  let filterStatus = $state("");
  let filterDateFrom = $state("");
  let filterDateTo = $state("");
  let filterQ = $state("");

  function formatInterests(v: unknown): string {
    if (v == null) return "—";
    if (Array.isArray(v)) return (v as string[]).join(", ") || "—";
    return String(v) || "—";
  }

  const leads = $derived(
    allLeads.filter((s) => {
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterDateFrom && s.inserted_at < filterDateFrom) return false;
      if (filterDateTo && s.inserted_at.slice(0, 10) > filterDateTo) return false;
      if (filterQ) {
        const q = filterQ.trim().toLowerCase();
        const text = [s.display_id, s.first_name, s.middle_name, s.last_name, s.email, s.phone, s.note]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    }),
  );

  function displayName(s: EvacuationLead): string {
    const parts = [s.first_name, s.middle_name, s.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "\u2014";
  }

  // Inline status editing
  let statusOverrides = new SvelteMap<string, string>();

  const badgeStyleMap: Record<string, { bg: string; color: string }> = {
    "badge-blue":   { bg: "var(--badge-blue-bg)",   color: "var(--badge-blue-text)" },
    "badge-green":  { bg: "var(--badge-green-bg)",  color: "var(--badge-green-text)" },
    "badge-red":    { bg: "var(--badge-red-bg)",    color: "var(--badge-red-text)" },
    "badge-yellow": { bg: "var(--badge-yellow-bg)", color: "var(--badge-yellow-text)" },
    "badge-purple": { bg: "var(--badge-purple-bg)", color: "var(--badge-purple-text)" },
    "badge-orange": { bg: "var(--badge-orange-bg)", color: "var(--badge-orange-text)" },
  };

  function getEffectiveStatus(lead: EvacuationLead): string {
    return statusOverrides.get(String(lead.id)) ?? lead.status ?? "open";
  }

  function getStatusBadgeStyle(lead: EvacuationLead): string {
    const effectiveStatus = getEffectiveStatus(lead);
    // eslint-disable-next-line security/detect-object-injection
    const badgeKey = evacuationLeadStatusColors[effectiveStatus];
    // eslint-disable-next-line security/detect-object-injection
    const style = badgeKey ? badgeStyleMap[badgeKey] : null;
    if (!style) return "";
    return `background-color: ${style.bg}; color: ${style.color};`;
  }

  function isOverdue(dueDate: string | null): boolean {
    if (dueDate == null) return false;
    return new Date(dueDate) < new Date();
  }

  async function handleInlineStatusChange(lead: EvacuationLead, newStatus: string) {
    if (newStatus === "closed_lost") {
      toast.info("Loss reason required \u2014 please update status on the detail page");
      return;
    }

    const prev = getEffectiveStatus(lead);
    statusOverrides.set(String(lead.id), newStatus);

    try {
      await api(`/api/evacuation-leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success("Status updated");
    } catch {
      if (prev === (lead.status ?? "open")) {
        statusOverrides.delete(String(lead.id));
      } else {
        statusOverrides.set(String(lead.id), prev);
      }
      toast.error("Failed to update status");
    }
  }

  const evacuationLeadStatusValues = ["open", "pending_response", "qualified", "closed_lost", "closed_converted"] as const;

  const hasActiveFilters = $derived(
    !!(filterStatus || filterDateFrom || filterDateTo || filterQ),
  );
</script>

<EntityListPage
  title="Evacuation Leads"
  breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Evacuation Leads" }]}
  items={leads}
  error={form?.error}
  columns={[
    { key: "displayId", label: "ID", sortable: true, sortValue: (s) => s.display_id ?? "" },
    { key: "name", label: "Name", sortable: true, sortValue: (s) => displayName(s).toLowerCase() },
    { key: "email", label: "Email", sortable: true, sortValue: (s) => s.email ?? "" },
    { key: "phone", label: "Phone", sortable: true, sortValue: (s) => s.phone ?? "" },
    { key: "interests", label: "Interests" },
    { key: "score", label: "Score", sortable: true, sortValue: (s) => String(s.scoreTotal ?? -1).padStart(4, "0") },
    { key: "status", label: "Status", sortable: true, sortValue: (s) => s.status ?? "" },
    { key: "channel", label: "Channel" },
    { key: "source", label: "Source" },
    { key: "notes", label: "Notes" },
    { key: "nextAction", label: "Next Action" },
    { key: "date", label: "Date", sortable: true, sortValue: (s) => s.inserted_at },
  ]}
  defaultSortKey="date"
  defaultSortDirection="desc"
  clientPageSize={25}
  canDelete={false}
  emptyMessage="No evacuation leads found."
>
  {#snippet searchForm()}
    <div class="mt-4 mb-6 flex flex-wrap gap-3 items-end">
      <div>
        <label for="status" class="block text-xs font-medium text-text-muted mb-1">Status</label>
        <select id="status" class="glass-input px-3 py-1.5 text-sm" bind:value={filterStatus}>
          <option value="">All</option>
          {#each evacuationLeadStatusValues as statusVal, i (i)}
            <!-- eslint-disable-next-line security/detect-object-injection -->
            <option value={statusVal}>{evacuationLeadStatusLabels[statusVal] ?? statusVal}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="dateFrom" class="block text-xs font-medium text-text-muted mb-1">Date From</label>
        <input id="dateFrom" type="date" class="glass-input px-3 py-1.5 text-sm" bind:value={filterDateFrom} />
      </div>
      <div>
        <label for="dateTo" class="block text-xs font-medium text-text-muted mb-1">Date To</label>
        <input id="dateTo" type="date" class="glass-input px-3 py-1.5 text-sm" bind:value={filterDateTo} />
      </div>
      <div class="relative flex-1 min-w-[200px]">
        <label for="q" class="block text-xs font-medium text-text-muted mb-1">Search</label>
        <div class="relative">
          <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input id="q" type="text" class="glass-input w-full pl-9 pr-3 py-1.5 text-sm" placeholder="Name, email, phone..." bind:value={filterQ} />
        </div>
      </div>
      {#if hasActiveFilters}
        <button type="button" class="btn-ghost text-sm" onclick={() => { filterStatus = ""; filterDateFrom = ""; filterDateTo = ""; filterQ = ""; }}>Clear</button>
      {/if}
    </div>
  {/snippet}
  {#snippet desktopRow(lead)}
    <td class="font-mono text-sm whitespace-nowrap">
      <a href={resolve(`/leads/evacuation-leads/${lead.id}`)} class="text-accent hover:text-[var(--link-hover)]">{lead.display_id ?? "\u2014"}</a>
    </td>
    <td class="font-medium">
      <a href={resolve(`/leads/evacuation-leads/${lead.id}`)} class="text-accent hover:text-[var(--link-hover)]">{displayName(lead)}</a>
    </td>
    <td class="text-text-secondary">{lead.email ?? "\u2014"}</td>
    <td class="text-text-secondary">{lead.phone ?? "\u2014"}</td>
    <td class="text-text-secondary text-sm max-w-[150px] truncate">{formatInterests(lead.interests)}</td>
    <td>
      {#if lead.scoreTotal != null}
        <LeadScoreBadge score={lead.scoreTotal} band={getLeadScoreBand(lead.scoreTotal)} />
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
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
        {#each evacuationLeadStatusValues as statusVal, i (i)}
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <option value={statusVal}>{evacuationLeadStatusLabels[statusVal] ?? statusVal}</option>
        {/each}
      </select>
    </td>
    <td class="text-text-secondary text-sm">{lead.crm_channel ?? "\u2014"}</td>
    <td class="text-text-secondary text-sm">{lead.crm_source ?? "\u2014"}</td>
    <td>
      <InlineNoteEditor
        value={lead.note}
        onSave={async (note) => {
          await api(`/api/evacuation-leads/${lead.id}`, {
            method: "PATCH",
            body: JSON.stringify({ note }),
            headers: { "Content-Type": "application/json" },
          });
          lead.note = note;
        }}
      />
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
    <td class="text-text-muted">{formatDateTime(lead.inserted_at)}</td>
  {/snippet}
  {#snippet mobileCard(lead)}
    <a href={resolve(`/leads/evacuation-leads/${lead.id}`)} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      {#if lead.display_id}
        <span class="font-mono text-xs text-text-muted">{lead.display_id}</span>
      {/if}
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium text-accent">{displayName(lead)}</span>
        <div class="flex items-center gap-2">
          {#if lead.scoreTotal != null}
            <LeadScoreBadge score={lead.scoreTotal} band={getLeadScoreBand(lead.scoreTotal)} />
          {/if}
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <span class="glass-badge {evacuationLeadStatusColors[getEffectiveStatus(lead)] ?? 'bg-glass text-text-secondary'}">
            <!-- eslint-disable-next-line security/detect-object-injection -->
            {evacuationLeadStatusLabels[getEffectiveStatus(lead)] ?? getEffectiveStatus(lead)}
          </span>
        </div>
      </div>
      {#if lead.email}
        <p class="text-sm text-text-secondary truncate">{lead.email}</p>
      {/if}
      {#if lead.phone}
        <p class="text-sm text-text-secondary">{lead.phone}</p>
      {/if}
      {#if lead.crm_channel || lead.crm_source}
        <p class="text-xs text-text-secondary mt-1">
          {#if lead.crm_channel}{lead.crm_channel}{/if}
          {#if lead.crm_channel && lead.crm_source} &middot; {/if}
          {#if lead.crm_source}{lead.crm_source}{/if}
        </p>
      {/if}
      {#if lead.nextAction}
        <p class="text-xs text-text-muted mt-1 truncate">
          Next: {#if lead.nextAction.type}{lead.nextAction.type}: {/if}{lead.nextAction.description ?? ""}
        </p>
      {/if}
      <div class="mt-2 text-xs text-text-muted">{formatDateTime(lead.inserted_at)}</div>
    </a>
  {/snippet}
</EntityListPage>
