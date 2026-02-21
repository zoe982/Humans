<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import Pagination from "$lib/components/Pagination.svelte";
  import { activityTypeColors } from "$lib/constants/colors";
  import { activityTypeLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import { Search } from "lucide-svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Activity = {
    id: string;
    displayId: string;
    type: string;
    subject: string;
    notes: string | null;
    body: string | null;
    activityDate: string;
    humanId: string | null;
    humanName: string | null;
    accountId: string | null;
    accountName: string | null;
    routeSignupId: string | null;
    websiteBookingRequestId: string | null;
    createdAt: string;
  };

  const activities = $derived(data.activities as Activity[]);

  const paginationBaseUrl = $derived.by(() => {
    const params = new URLSearchParams();
    if (data.q) params.set("q", data.q);
    if (data.type) params.set("type", data.type);
    if (data.dateFrom) params.set("dateFrom", data.dateFrom);
    if (data.dateTo) params.set("dateTo", data.dateTo);
    const qs = params.toString();
    return `/activities${qs ? `?${qs}` : ""}`;
  });

  function truncate(s: string | null, len: number): string {
    if (!s) return "\u2014";
    return s.length > len ? s.slice(0, len) + "..." : s;
  }

  function linkedEntities(a: Activity): { label: string; href: string }[] {
    const links: { label: string; href: string }[] = [];
    if (a.humanName && a.humanId) links.push({ label: a.humanName, href: `/humans/${a.humanId}` });
    if (a.accountName && a.accountId) links.push({ label: a.accountName, href: `/accounts/${a.accountId}` });
    if (a.routeSignupId) links.push({ label: `Signup ${a.routeSignupId.slice(0, 8)}...`, href: `/leads/route-signups/${a.routeSignupId}` });
    if (a.websiteBookingRequestId) links.push({ label: `Booking ${a.websiteBookingRequestId.slice(0, 8)}...`, href: `/leads/website-booking-requests/${a.websiteBookingRequestId}` });
    return links;
  }
</script>

<EntityListPage
  title="Activities"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Activities" }]}
  newHref="/activities/new"
  newLabel="New Activity"
  items={activities}
  error={form?.error}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "type", label: "Type", sortable: true, sortValue: (a) => activityTypeLabels[a.type] ?? a.type },
    { key: "subject", label: "Subject", sortable: true, sortValue: (a) => a.subject },
    { key: "notes", label: "Notes" },
    { key: "linkedTo", label: "Linked To", sortable: true, sortValue: (a) => a.humanName ?? a.accountName ?? "" },
    { key: "date", label: "Date", sortable: true, sortValue: (a) => a.activityDate },
  ]}
  deleteMessage="Are you sure you want to delete this activity?"
  canDelete={true}
  pagination={{ page: data.page, limit: data.limit, total: data.total, baseUrl: paginationBaseUrl }}
>
  {#snippet searchForm()}
    <form method="GET" class="mt-4 flex flex-wrap items-end gap-4 glass-card p-4 mb-6">
      <div class="flex-1 min-w-[200px]">
        <label for="searchFilter" class="block text-sm font-medium text-text-secondary mb-1">Search</label>
        <div class="relative">
          <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input id="searchFilter" name="q" type="text" value={data.q ?? ""} placeholder="Search subject or notes..." class="glass-input w-full pl-8 pr-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label for="typeFilter" class="block text-sm font-medium text-text-secondary mb-1">Type</label>
        <SearchableSelect
          options={ACTIVITY_TYPE_OPTIONS}
          name="type"
          id="typeFilter"
          value={data.type ?? ""}
          emptyOption="All"
          placeholder="Filter by type..."
        />
      </div>
      <div>
        <label for="dateFrom" class="block text-sm font-medium text-text-secondary mb-1">From</label>
        <input id="dateFrom" name="dateFrom" type="date" value={data.dateFrom} class="glass-input px-3 py-2 text-sm" />
      </div>
      <div>
        <label for="dateTo" class="block text-sm font-medium text-text-secondary mb-1">To</label>
        <input id="dateTo" name="dateTo" type="date" value={data.dateTo} class="glass-input px-3 py-2 text-sm" />
      </div>
      <Button type="submit">Filter</Button>
    </form>
  {/snippet}
  {#snippet desktopRow(activity)}
    <td class="font-mono text-sm">
      <a href="/activities/{activity.id}" class="text-accent hover:text-cyan-300">{activity.displayId}</a>
    </td>
    <td>
      <span class="glass-badge {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
        {activityTypeLabels[activity.type] ?? activity.type}
      </span>
    </td>
    <td class="font-medium">
      <a href="/activities/{activity.id}" class="text-accent hover:text-cyan-300">{activity.subject}</a>
    </td>
    <td class="text-text-muted max-w-xs truncate">{truncate(activity.notes ?? activity.body, 80)}</td>
    <td>
      {#each linkedEntities(activity) as entity, i}
        {#if i > 0}<span class="text-text-muted">, </span>{/if}
        <a href={entity.href} class="text-accent hover:text-cyan-300">{entity.label}</a>
      {:else}
        <span class="text-text-muted">\u2014</span>
      {/each}
    </td>
    <td class="text-text-muted">{new Date(activity.activityDate).toLocaleDateString()}</td>
  {/snippet}
  {#snippet mobileCard(activity)}
    <a href="/activities/{activity.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{activity.displayId}</span>
      <div class="flex items-center justify-between mb-2">
        <span class="glass-badge text-xs {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
          {activityTypeLabels[activity.type] ?? activity.type}
        </span>
        <span class="text-xs text-text-muted">{new Date(activity.activityDate).toLocaleDateString()}</span>
      </div>
      <p class="font-medium text-text-primary">{activity.subject}</p>
      {#if linkedEntities(activity).length > 0}
        <p class="text-sm text-accent mt-1">{linkedEntities(activity).map(e => e.label).join(", ")}</p>
      {/if}
      {#if activity.notes || activity.body}
        <p class="text-sm text-text-muted mt-1 line-clamp-2">{truncate(activity.notes ?? activity.body, 100)}</p>
      {/if}
      <div class="mt-2 flex justify-end">
        <button type="button" class="text-red-400 hover:text-red-300 text-xs" onclick={(e) => { e.preventDefault(); }}>Delete</button>
      </div>
    </a>
  {/snippet}
</EntityListPage>
