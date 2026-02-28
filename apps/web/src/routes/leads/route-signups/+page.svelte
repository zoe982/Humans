<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import LeadScoreBadge from "$lib/components/LeadScoreBadge.svelte";
  import { getLeadScoreBand } from "@humans/shared";
  import { Search } from "lucide-svelte";
  import { signupStatusLabels } from "$lib/constants/labels";
  import { formatRelativeTime, formatDateTime } from "$lib/utils/format";
  import { resolve } from "$app/paths";
  import InlineNoteEditor from "$lib/components/InlineNoteEditor.svelte";
  import { api } from "$lib/api";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Signup = {
    id: string;
    display_id: string | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    email: string | null;
    origin: string | null;
    destination: string | null;
    status: string | null;
    note: string | null;
    inserted_at: string;
    consent: boolean | null;
    newsletter_opt_in: boolean | null;
    lastActivityDate: string | null;
    scoreTotal: number | null;
  };

  const allSignups = $derived(data.signups as Signup[]);

  let filterStatus = $state("");
  let filterOrigin = $state("");
  let filterDestination = $state("");
  let filterDateFrom = $state("");
  let filterDateTo = $state("");
  let filterQ = $state("");

  const signups = $derived(
    allSignups.filter((s) => {
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterOrigin && !(s.origin ?? "").toLowerCase().includes(filterOrigin.toLowerCase())) return false;
      if (filterDestination && !(s.destination ?? "").toLowerCase().includes(filterDestination.toLowerCase())) return false;
      if (filterDateFrom && s.inserted_at < filterDateFrom) return false;
      if (filterDateTo && s.inserted_at.slice(0, 10) > filterDateTo) return false;
      if (filterQ) {
        const q = filterQ.trim().toLowerCase();
        const text = [s.display_id, s.first_name, s.middle_name, s.last_name, s.email, s.origin, s.destination, s.note]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    }),
  );

  function displayName(s: Signup): string {
    const parts = [s.first_name, s.middle_name, s.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "\u2014";
  }

  const statusColorMap: Record<string, string> = {
    "Open": "badge-blue",
    "Pending Response": "badge-yellow",
    "Qualified": "badge-yellow",
    "Closed - Lost": "badge-red",
    "Closed - Converted": "badge-green",
  };

  const hasActiveFilters = $derived(
    !!(filterStatus || filterOrigin || filterDestination || filterDateFrom || filterDateTo || filterQ),
  );
</script>

<EntityListPage
  title="Route Signups"
  breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Route Signups" }]}
  items={signups}
  error={form?.error}
  columns={[
    { key: "displayId", label: "ID", sortable: true, sortValue: (s) => s.display_id ?? "" },
    { key: "name", label: "Name", sortable: true, sortValue: (s) => displayName(s).toLowerCase() },
    { key: "email", label: "Email", sortable: true, sortValue: (s) => s.email ?? "" },
    { key: "origin", label: "Origin", sortable: true, sortValue: (s) => s.origin ?? "" },
    { key: "destination", label: "Destination", sortable: true, sortValue: (s) => s.destination ?? "" },
    { key: "score", label: "Score", sortable: true, sortValue: (s) => String(s.scoreTotal ?? -1).padStart(4, "0") },
    { key: "status", label: "Status", sortable: true, sortValue: (s) => s.status ?? "" },
    { key: "notes", label: "Notes" },
    { key: "date", label: "Date", sortable: true, sortValue: (s) => s.inserted_at },
  ]}
  defaultSortKey="date"
  defaultSortDirection="desc"
  clientPageSize={25}
  canDelete={false}
  emptyMessage="No route signups found."
>
  {#snippet searchForm()}
    <div class="mt-4 mb-6 flex flex-wrap gap-3 items-end">
      <div>
        <label for="status" class="block text-xs font-medium text-text-muted mb-1">Status</label>
        <select id="status" class="glass-input px-3 py-1.5 text-sm" bind:value={filterStatus}>
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="pending_response">Pending Response</option>
          <option value="qualified">Qualified</option>
          <option value="closed_lost">Closed - Lost</option>
          <option value="closed_converted">Closed - Converted</option>
        </select>
      </div>
      <div>
        <label for="origin" class="block text-xs font-medium text-text-muted mb-1">Origin</label>
        <input id="origin" type="text" class="glass-input px-3 py-1.5 text-sm w-32" placeholder="e.g. Rome" bind:value={filterOrigin} />
      </div>
      <div>
        <label for="destination" class="block text-xs font-medium text-text-muted mb-1">Destination</label>
        <input id="destination" type="text" class="glass-input px-3 py-1.5 text-sm w-32" placeholder="e.g. New York" bind:value={filterDestination} />
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
          <input id="q" type="text" class="glass-input w-full pl-9 pr-3 py-1.5 text-sm" placeholder="Name, email, route..." bind:value={filterQ} />
        </div>
      </div>
      {#if hasActiveFilters}
        <button type="button" class="btn-ghost text-sm" onclick={() => { filterStatus = ""; filterOrigin = ""; filterDestination = ""; filterDateFrom = ""; filterDateTo = ""; filterQ = ""; }}>Clear</button>
      {/if}
    </div>
  {/snippet}
  {#snippet desktopRow(signup)}
    <td class="font-mono text-sm whitespace-nowrap">
      <a href={resolve(`/leads/route-signups/${signup.id}`)} class="text-accent hover:text-[var(--link-hover)]">{signup.display_id ?? "\u2014"}</a>
    </td>
    <td class="font-medium">
      <a href={resolve(`/leads/route-signups/${signup.id}`)} class="text-accent hover:text-[var(--link-hover)]">{displayName(signup)}</a>
    </td>
    <td class="text-text-secondary">{signup.email ?? "\u2014"}</td>
    <td class="text-text-secondary">{signup.origin ?? "\u2014"}</td>
    <td class="text-text-secondary">{signup.destination ?? "\u2014"}</td>
    <td>
      {#if signup.scoreTotal != null}
        <LeadScoreBadge score={signup.scoreTotal} band={getLeadScoreBand(signup.scoreTotal)} />
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
    <td>
      <StatusBadge status={signupStatusLabels[signup.status ?? ""] ?? signup.status ?? "\u2014"} colorMap={statusColorMap} />
    </td>
    <td>
      <InlineNoteEditor
        value={signup.note}
        onSave={async (note) => {
          await api(`/api/route-signups/${signup.id}`, {
            method: "PATCH",
            body: JSON.stringify({ note }),
            headers: { "Content-Type": "application/json" },
          });
          signup.note = note;
        }}
      />
    </td>
    <td class="text-text-muted">{formatDateTime(signup.inserted_at)}</td>
  {/snippet}
  {#snippet mobileCard(signup)}
    <a href={resolve(`/leads/route-signups/${signup.id}`)} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      {#if signup.display_id}
        <span class="font-mono text-xs text-text-muted">{signup.display_id}</span>
      {/if}
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium text-accent">{displayName(signup)}</span>
        <div class="flex items-center gap-2">
          {#if signup.scoreTotal != null}
            <LeadScoreBadge score={signup.scoreTotal} band={getLeadScoreBand(signup.scoreTotal)} />
          {/if}
          <StatusBadge status={signupStatusLabels[signup.status ?? ""] ?? signup.status ?? "\u2014"} colorMap={statusColorMap} />
        </div>
      </div>
      {#if signup.email}
        <p class="text-sm text-text-secondary truncate">{signup.email}</p>
      {/if}
      <div class="mt-1 flex gap-3 text-sm text-text-muted">
        {#if signup.origin}<span>{signup.origin}</span>{/if}
        {#if signup.origin && signup.destination}<span>&rarr;</span>{/if}
        {#if signup.destination}<span>{signup.destination}</span>{/if}
      </div>
      {#if signup.lastActivityDate}
        <p class="mt-1 text-xs text-text-muted">Last activity: {formatRelativeTime(signup.lastActivityDate)}</p>
      {/if}
      <div class="mt-2 text-xs text-text-muted">{formatDateTime(signup.inserted_at)}</div>
    </a>
  {/snippet}
</EntityListPage>
