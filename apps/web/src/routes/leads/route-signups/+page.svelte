<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import { Search } from "lucide-svelte";
  import { signupStatusLabels } from "$lib/constants/labels";
  import { signupStatusColors } from "$lib/constants/colors";
  import { formatRelativeTime } from "$lib/utils/format";
  import { Button } from "$lib/components/ui/button";
  import { resolve } from "$app/paths";

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
  };

  const signups = $derived(data.signups as Signup[]);

  function displayName(s: Signup): string {
    const parts = [s.first_name, s.middle_name, s.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "\u2014";
  }

  function formatDatetime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const statusColorMap: Record<string, string> = {
    "Open": "badge-blue",
    "Qualified": "badge-yellow",
    "Converted": "badge-green",
    "Rejected": "badge-red",
  };

  const hasActiveFilters = $derived(
    !!(data.status || data.q || data.origin || data.destination || data.dateFrom || data.dateTo)
  );

  const paginationBaseUrl = $derived.by(() => {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const params = new URLSearchParams();
    if (data.status) params.set("status", data.status);
    if (data.q) params.set("q", data.q);
    if (data.origin) params.set("origin", data.origin);
    if (data.destination) params.set("destination", data.destination);
    if (data.dateFrom) params.set("dateFrom", data.dateFrom);
    if (data.dateTo) params.set("dateTo", data.dateTo);
    const qs = params.toString();
    return `/leads/route-signups${qs ? `?${qs}` : ""}`;
  });
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
    { key: "status", label: "Status", sortable: true, sortValue: (s) => s.status ?? "" },
    { key: "date", label: "Date", sortable: true, sortValue: (s) => s.inserted_at },
  ]}
  defaultSortKey="date"
  defaultSortDirection="desc"
  deleteAction="?/delete"
  deleteMessage="Are you sure you want to delete this route signup? This cannot be undone."
  canDelete={data.userRole === "admin"}
  pagination={{ page: data.page, limit: data.limit, total: data.total, baseUrl: paginationBaseUrl }}
  emptyMessage="No route signups found."
>
  {#snippet searchForm()}
    <form method="GET" class="mt-4 mb-6 flex flex-wrap gap-3 items-end">
      <div>
        <label for="status" class="block text-xs font-medium text-text-muted mb-1">Status</label>
        <select id="status" name="status" class="glass-input px-3 py-1.5 text-sm" value={data.status}>
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="qualified">Qualified</option>
          <option value="closed_converted">Converted</option>
          <option value="closed_rejected">Rejected</option>
        </select>
      </div>
      <div>
        <label for="origin" class="block text-xs font-medium text-text-muted mb-1">Origin</label>
        <input id="origin" name="origin" type="text" class="glass-input px-3 py-1.5 text-sm w-32" placeholder="e.g. Rome" value={data.origin} />
      </div>
      <div>
        <label for="destination" class="block text-xs font-medium text-text-muted mb-1">Destination</label>
        <input id="destination" name="destination" type="text" class="glass-input px-3 py-1.5 text-sm w-32" placeholder="e.g. New York" value={data.destination} />
      </div>
      <div>
        <label for="dateFrom" class="block text-xs font-medium text-text-muted mb-1">Date From</label>
        <input id="dateFrom" name="dateFrom" type="date" class="glass-input px-3 py-1.5 text-sm" value={data.dateFrom} />
      </div>
      <div>
        <label for="dateTo" class="block text-xs font-medium text-text-muted mb-1">Date To</label>
        <input id="dateTo" name="dateTo" type="date" class="glass-input px-3 py-1.5 text-sm" value={data.dateTo} />
      </div>
      <div class="relative flex-1 min-w-[200px]">
        <label for="q" class="block text-xs font-medium text-text-muted mb-1">Search</label>
        <div class="relative">
          <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input id="q" name="q" type="text" class="glass-input w-full pl-9 pr-3 py-1.5 text-sm" placeholder="Name, email, route..." value={data.q} />
        </div>
      </div>
      <Button type="submit" size="sm">Filter</Button>
      {#if hasActiveFilters}
        <a href={resolve('/leads/route-signups')} class="btn-ghost text-sm">Clear</a>
      {/if}
    </form>
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
      <StatusBadge status={signupStatusLabels[signup.status ?? ""] ?? signup.status ?? "\u2014"} colorMap={statusColorMap} />
    </td>
    <td class="text-text-muted">{formatDatetime(signup.inserted_at)}</td>
  {/snippet}
  {#snippet mobileCard(signup)}
    <a href={resolve(`/leads/route-signups/${signup.id}`)} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      {#if signup.display_id}
        <span class="font-mono text-xs text-text-muted">{signup.display_id}</span>
      {/if}
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium text-accent">{displayName(signup)}</span>
        <StatusBadge status={signupStatusLabels[signup.status ?? ""] ?? signup.status ?? "\u2014"} colorMap={statusColorMap} />
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
      <div class="mt-2 text-xs text-text-muted">{formatDatetime(signup.inserted_at)}</div>
    </a>
  {/snippet}
</EntityListPage>
