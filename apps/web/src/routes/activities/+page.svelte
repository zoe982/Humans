<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import { activityTypeColors } from "$lib/constants/colors";
  import { activityTypeLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { formatDate } from "$lib/utils/format";
  import { resolve } from "$app/paths";
  import { browser } from "$app/environment";
  import { getStore } from "$lib/data/stores.svelte";

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
    ownerId: string | null;
    ownerName: string | null;
    ownerDisplayId: string | null;
    createdAt: string;
  };

  const allActivities = $derived((browser ? getStore<Activity>("activities").items : data.activities) as Activity[]);

  let filterType = $state("");
  let filterDateFrom = $state("");
  let filterDateTo = $state("");
  let filterQ = $state("");

  const activities = $derived(
    allActivities.filter((a) => {
      if (filterType && a.type !== filterType) return false;
      if (filterDateFrom && a.activityDate < filterDateFrom) return false;
      if (filterDateTo && a.activityDate > filterDateTo) return false;
      if (filterQ) {
        const q = filterQ.trim().toLowerCase();
        const text = [a.displayId, a.subject, a.notes, a.body, a.humanName, a.accountName, a.ownerName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    }),
  );

  function truncate(s: string | null, len: number): string {
    if (!s) return "\u2014";
    return s.length > len ? s.slice(0, len) + "..." : s;
  }

  function linkedEntities(a: Activity): { label: string; href: string }[] {
    const links: { label: string; href: string }[] = [];
    if (a.humanName && a.humanId) links.push({ label: a.humanName, href: resolve(`/humans/${a.humanId}`) });
    if (a.accountName && a.accountId) links.push({ label: a.accountName, href: resolve(`/accounts/${a.accountId}`) });
    if (a.routeSignupId) links.push({ label: `Signup ${a.routeSignupId.slice(0, 8)}...`, href: resolve(`/leads/route-signups/${a.routeSignupId}`) });
    if (a.websiteBookingRequestId) links.push({ label: `Booking ${a.websiteBookingRequestId.slice(0, 8)}...`, href: resolve(`/leads/website-booking-requests/${a.websiteBookingRequestId}`) });
    return links;
  }

  const hasActiveFilters = $derived(!!(filterType || filterDateFrom || filterDateTo || filterQ));
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
    { key: "owner", label: "Owner", sortable: true, sortValue: (a) => a.ownerName ?? "" },
    { key: "subject", label: "Subject", sortable: true, sortValue: (a) => a.subject },
    { key: "notes", label: "Notes" },
    { key: "linkedTo", label: "Linked To", sortable: true, sortValue: (a) => a.humanName ?? a.accountName ?? "" },
    { key: "date", label: "Date", sortable: true, sortValue: (a) => a.activityDate },
  ]}
  clientPageSize={25}
>
  {#snippet searchForm()}
    <div class="mt-4 flex flex-wrap items-end gap-4 glass-card p-4 mb-6">
      <div class="flex-1 min-w-[200px]">
        <label for="searchFilter" class="block text-sm font-medium text-text-secondary mb-1">Search</label>
        <input id="searchFilter" type="text" bind:value={filterQ} placeholder="Search subject or notes..." class="glass-input w-full px-3 py-2 text-sm" />
      </div>
      <div class="flex-1 min-w-[200px]">
        <label for="typeFilter" class="block text-sm font-medium text-text-secondary mb-1">Type</label>
        <SearchableSelect
          options={ACTIVITY_TYPE_OPTIONS}
          name="type"
          id="typeFilter"
          value={filterType}
          emptyOption="All"
          placeholder="Filter by type..."
          onSelect={(val) => { filterType = val; }}
        />
      </div>
      <div>
        <label for="dateFrom" class="block text-sm font-medium text-text-secondary mb-1">From</label>
        <input id="dateFrom" type="date" bind:value={filterDateFrom} class="glass-input px-3 py-2 text-sm" />
      </div>
      <div>
        <label for="dateTo" class="block text-sm font-medium text-text-secondary mb-1">To</label>
        <input id="dateTo" type="date" bind:value={filterDateTo} class="glass-input px-3 py-2 text-sm" />
      </div>
      {#if hasActiveFilters}
        <button type="button" class="btn-ghost text-sm" onclick={() => { filterType = ""; filterDateFrom = ""; filterDateTo = ""; filterQ = ""; }}>Clear</button>
      {/if}
    </div>
  {/snippet}
  {#snippet desktopRow(activity)}
    <td class="font-mono text-sm whitespace-nowrap">
      <a href={resolve(`/activities/${activity.id}`)} class="text-accent hover:text-[var(--link-hover)]">{activity.displayId}</a>
    </td>
    <td>
      <span class="glass-badge {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
        {activityTypeLabels[activity.type] ?? activity.type}
      </span>
    </td>
    <td class="text-sm text-text-secondary">{activity.ownerName ?? "\u2014"}</td>
    <td class="font-medium">
      <a href={resolve(`/activities/${activity.id}`)} class="text-accent hover:text-[var(--link-hover)]">{activity.subject}</a>
    </td>
    <td class="text-text-muted max-w-xs truncate">{truncate(activity.notes ?? activity.body, 80)}</td>
    <td>
      {#each linkedEntities(activity) as entity, i (entity.href)}
        {#if i > 0}<span class="text-text-muted">, </span>{/if}
        <a href={resolve(entity.href)} class="text-accent hover:text-[var(--link-hover)]">{entity.label}</a>
      {:else}
        <span class="text-text-muted">\u2014</span>
      {/each}
    </td>
    <td class="text-text-muted">{formatDate(activity.activityDate)}</td>
  {/snippet}
  {#snippet mobileCard(activity)}
    <a href={resolve(`/activities/${activity.id}`)} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition-all duration-200">
      <span class="font-mono text-xs text-text-muted">{activity.displayId}</span>
      <div class="flex items-center justify-between mb-2">
        <span class="glass-badge text-xs {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
          {activityTypeLabels[activity.type] ?? activity.type}
        </span>
        <span class="text-xs text-text-muted">{formatDate(activity.activityDate)}</span>
      </div>
      <p class="font-medium text-text-primary">{activity.subject}</p>
      {#if activity.ownerName}
        <p class="text-xs text-text-muted mt-0.5">Owner: {activity.ownerName}</p>
      {/if}
      {#if linkedEntities(activity).length > 0}
        <p class="text-sm text-accent mt-1">{linkedEntities(activity).map(e => e.label).join(", ")}</p>
      {/if}
      {#if activity.notes || activity.body}
        <p class="text-sm text-text-muted mt-1 line-clamp-2">{truncate(activity.notes ?? activity.body, 100)}</p>
      {/if}
    </a>
  {/snippet}
</EntityListPage>
