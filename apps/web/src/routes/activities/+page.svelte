<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import Pagination from "$lib/components/Pagination.svelte";
  import { activityTypeColors } from "$lib/constants/colors";
  import { activityTypeLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";

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
    createdAt: string;
  };

  const activities = $derived(data.activities as Activity[]);

  const paginationBaseUrl = $derived.by(() => {
    const params = new URLSearchParams();
    if (data.type) params.set("type", data.type);
    if (data.dateFrom) params.set("dateFrom", data.dateFrom);
    if (data.dateTo) params.set("dateTo", data.dateTo);
    const qs = params.toString();
    return `/activities${qs ? `?${qs}` : ""}`;
  });

  function truncate(s: string | null, len: number): string {
    if (!s) return "—";
    return s.length > len ? s.slice(0, len) + "..." : s;
  }

  function linkedEntity(a: Activity): { label: string; href: string } | null {
    if (a.humanName && a.humanId) return { label: a.humanName, href: `/humans/${a.humanId}` };
    if (a.accountName && a.accountId) return { label: a.accountName, href: `/accounts/${a.accountId}` };
    if (a.routeSignupId) return { label: `Signup ${a.routeSignupId.slice(0, 8)}...`, href: `/leads/route-signups/${a.routeSignupId}` };
    return null;
  }

  // Sorting state
  type SortColumn = "type" | "subject" | "linkedTo" | "date";
  let sortColumn = $state<SortColumn | null>(null);
  let sortDirection = $state<"asc" | "desc">("asc");

  function toggleSort(column: SortColumn) {
    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }
  }

  function ariaSort(column: SortColumn): "ascending" | "descending" | "none" {
    if (sortColumn !== column) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  }

  function sortArrow(column: SortColumn): string {
    if (sortColumn !== column) return "";
    return sortDirection === "asc" ? " \u25B2" : " \u25BC";
  }

  const sortedActivities = $derived.by(() => {
    if (!sortColumn) return activities;
    const col = sortColumn;
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...activities].sort((a, b) => {
      let av: string;
      let bv: string;
      switch (col) {
        case "type":
          av = activityTypeLabels[a.type] ?? a.type;
          bv = activityTypeLabels[b.type] ?? b.type;
          break;
        case "subject":
          av = a.subject;
          bv = b.subject;
          break;
        case "linkedTo":
          av = a.humanName ?? a.accountName ?? "";
          bv = b.humanName ?? b.accountName ?? "";
          break;
        case "date":
          av = a.activityDate;
          bv = b.activityDate;
          break;
      }
      return av.localeCompare(bv) * dir;
    });
  });

  let pendingDeleteId = $state<string | null>(null);
  let deleteFormEl = $state<HTMLFormElement>();
</script>

<svelte:head>
  <title>Activities - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Activities" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Activities" }]}>
    {#snippet action()}
      <a href="/activities/new" class="btn-primary">New Activity</a>
    {/snippet}
  </PageHeader>

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <!-- Filters -->
  <form method="GET" class="mt-4 flex flex-wrap items-end gap-4 glass-card p-4 mb-6">
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
    <button type="submit" class="btn-primary">Filter</button>
  </form>

  <!-- Mobile card view -->
  <div class="sm:hidden space-y-3">
    {#each sortedActivities as activity (activity.id)}
      <a href="/activities/{activity.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
        <span class="font-mono text-xs text-text-muted">{activity.displayId}</span>
        <div class="flex items-center justify-between mb-2">
          <span class="glass-badge text-xs {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
            {activityTypeLabels[activity.type] ?? activity.type}
          </span>
          <span class="text-xs text-text-muted">{new Date(activity.activityDate).toLocaleDateString()}</span>
        </div>
        <p class="font-medium text-text-primary">{activity.subject}</p>
        {#if linkedEntity(activity)}
          {@const entity = linkedEntity(activity)!}
          <p class="text-sm text-accent mt-1">{entity.label}</p>
        {/if}
        {#if activity.notes || activity.body}
          <p class="text-sm text-text-muted mt-1 line-clamp-2">{truncate(activity.notes ?? activity.body, 100)}</p>
        {/if}
        <div class="mt-2 flex justify-end">
          <button type="button" class="text-red-400 hover:text-red-300 text-xs" onclick={(e) => { e.preventDefault(); pendingDeleteId = activity.id; }}>Delete</button>
        </div>
      </a>
    {:else}
      <div class="glass-card p-6 text-center text-sm text-text-muted">No activities found.</div>
    {/each}
  </div>

  <!-- Desktop table view -->
  <div class="glass-card overflow-hidden hidden sm:block">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th scope="col">ID</th>
          <th scope="col" aria-sort={ariaSort("type")}><button type="button" class="cursor-pointer select-none" onclick={() => toggleSort("type")}>Type<span aria-hidden="true">{sortArrow("type")}</span></button></th>
          <th scope="col" aria-sort={ariaSort("subject")}><button type="button" class="cursor-pointer select-none" onclick={() => toggleSort("subject")}>Subject<span aria-hidden="true">{sortArrow("subject")}</span></button></th>
          <th scope="col">Notes</th>
          <th scope="col" aria-sort={ariaSort("linkedTo")}><button type="button" class="cursor-pointer select-none" onclick={() => toggleSort("linkedTo")}>Linked To<span aria-hidden="true">{sortArrow("linkedTo")}</span></button></th>
          <th scope="col" aria-sort={ariaSort("date")}><button type="button" class="cursor-pointer select-none" onclick={() => toggleSort("date")}>Date<span aria-hidden="true">{sortArrow("date")}</span></button></th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each sortedActivities as activity (activity.id)}
          <tr class="glass-row-hover">
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
              {#if linkedEntity(activity)}
                {@const entity = linkedEntity(activity)!}
                <a href={entity.href} class="text-accent hover:text-cyan-300">{entity.label}</a>
              {:else}
                <span class="text-text-muted">—</span>
              {/if}
            </td>
            <td class="text-text-muted">{new Date(activity.activityDate).toLocaleDateString()}</td>
            <td>
              <button type="button" class="text-red-400 hover:text-red-300 text-sm" onclick={() => { pendingDeleteId = activity.id; }}>Delete</button>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="7" class="px-6 py-8 text-center text-sm text-text-muted">No activities found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <Pagination page={data.page} limit={data.limit} total={data.total} baseUrl={paginationBaseUrl} />
</div>

<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden">
  <input type="hidden" name="id" value={pendingDeleteId ?? ""} />
</form>

<ConfirmDialog
  open={pendingDeleteId !== null}
  message="Are you sure you want to delete this activity?"
  onConfirm={() => { deleteFormEl?.requestSubmit(); pendingDeleteId = null; }}
  onCancel={() => { pendingDeleteId = null; }}
/>
