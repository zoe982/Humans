<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import LeadScoreBadge from "$lib/components/LeadScoreBadge.svelte";
  import { getLeadScoreBand, routeSignupStatuses } from "@humans/shared";
  import { Search } from "lucide-svelte";
  import { signupStatusLabels } from "$lib/constants/labels";
  import { signupStatusColors } from "$lib/constants/colors";
  import { formatRelativeTime, formatDateTime, formatDate } from "$lib/utils/format";
  import { resolve } from "$app/paths";
  import InlineNoteEditor from "$lib/components/InlineNoteEditor.svelte";
  import { api } from "$lib/api";
  import { toast } from "svelte-sonner";
  import { SvelteMap } from "svelte/reactivity";
  import { browser } from "$app/environment";
  import { getStore } from "$lib/data/stores.svelte";

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
    crm_channel: string | null;
    crm_source: string | null;
    scoreTotal: number | null;
    nextAction: { type: string | null; description: string | null; dueDate: string | null } | null;
  };

  const allSignups = $derived((browser ? getStore<Signup>("route-signups").items : data.signups) as Signup[]);

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

  function getEffectiveStatus(signup: Signup): string {
    return statusOverrides.get(String(signup.id)) ?? signup.status ?? "open";
  }

  function getStatusBadgeStyle(signup: Signup): string {
    const effectiveStatus = getEffectiveStatus(signup);
    // eslint-disable-next-line security/detect-object-injection
    const badgeKey = signupStatusColors[effectiveStatus];
    // eslint-disable-next-line security/detect-object-injection
    const style = badgeKey ? badgeStyleMap[badgeKey] : null;
    if (!style) return "";
    return `background-color: ${style.bg}; color: ${style.color};`;
  }

  function isOverdue(dueDate: string | null): boolean {
    if (dueDate == null) return false;
    return new Date(dueDate) < new Date();
  }

  async function handleInlineStatusChange(signup: Signup, newStatus: string) {
    // closed_lost — redirect to detail page for loss reason
    if (newStatus === "closed_lost") {
      toast.info("Loss reason required \u2014 please update status on the detail page");
      return;
    }

    const prev = getEffectiveStatus(signup);
    statusOverrides.set(String(signup.id), newStatus);

    try {
      await api(`/api/route-signups/${signup.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success("Status updated");
    } catch {
      if (prev === (signup.status ?? "open")) {
        statusOverrides.delete(String(signup.id));
      } else {
        statusOverrides.set(String(signup.id), prev);
      }
      toast.error("Failed to update status");
    }
  }

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
      <select
        class="glass-select-badge"
        style={getStatusBadgeStyle(signup)}
        value={getEffectiveStatus(signup)}
        onchange={(e) => {
          const target = e.currentTarget;
          void handleInlineStatusChange(signup, target.value);
        }}
      >
        {#each routeSignupStatuses as status, i (i)}
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <option value={status}>{signupStatusLabels[status] ?? status}</option>
        {/each}
      </select>
    </td>
    <td class="text-text-secondary text-sm">{signup.crm_channel ?? "\u2014"}</td>
    <td class="text-text-secondary text-sm">{signup.crm_source ?? "\u2014"}</td>
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
    <td class="text-sm max-w-[200px]">
      {#if signup.nextAction}
        <div class="text-text-primary truncate">
          {#if signup.nextAction.type}{signup.nextAction.type}: {/if}{signup.nextAction.description ?? ""}
        </div>
        {#if signup.nextAction.dueDate}
          <div class="text-xs {isOverdue(signup.nextAction.dueDate) ? 'text-[var(--badge-red-text)]' : 'text-text-muted'}">
            Due {formatDate(signup.nextAction.dueDate)}
          </div>
        {/if}
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
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
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <span class="glass-badge {signupStatusColors[getEffectiveStatus(signup)] ?? 'bg-glass text-text-secondary'}">
            <!-- eslint-disable-next-line security/detect-object-injection -->
            {signupStatusLabels[getEffectiveStatus(signup)] ?? getEffectiveStatus(signup)}
          </span>
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
      {#if signup.crm_channel || signup.crm_source}
        <p class="text-xs text-text-secondary mt-1">
          {#if signup.crm_channel}{signup.crm_channel}{/if}
          {#if signup.crm_channel && signup.crm_source} &middot; {/if}
          {#if signup.crm_source}{signup.crm_source}{/if}
        </p>
      {/if}
      {#if signup.lastActivityDate}
        <p class="mt-1 text-xs text-text-muted">Last activity: {formatRelativeTime(signup.lastActivityDate)}</p>
      {/if}
      {#if signup.nextAction}
        <p class="text-xs text-text-muted mt-1 truncate">
          Next: {#if signup.nextAction.type}{signup.nextAction.type}: {/if}{signup.nextAction.description ?? ""}
        </p>
      {/if}
      <div class="mt-2 text-xs text-text-muted">{formatDateTime(signup.inserted_at)}</div>
    </a>
  {/snippet}
</EntityListPage>
