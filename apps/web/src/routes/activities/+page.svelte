<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";

  let { data }: { data: PageData } = $props();

  type Activity = {
    id: string;
    type: string;
    subject: string;
    notes: string | null;
    body: string | null;
    activityDate: string;
    humanId: string | null;
    humanName: string | null;
    routeSignupId: string | null;
    createdAt: string;
  };

  const activities = $derived(data.activities as Activity[]);

  const activityTypeLabels: Record<string, string> = {
    email: "Email",
    whatsapp_message: "WhatsApp",
    online_meeting: "Meeting",
    phone_call: "Phone Call",
  };

  const activityTypeColors: Record<string, string> = {
    email: "bg-[rgba(59,130,246,0.15)] text-blue-300",
    whatsapp_message: "bg-[rgba(34,197,94,0.15)] text-green-300",
    online_meeting: "bg-[rgba(168,85,247,0.15)] text-purple-300",
    phone_call: "bg-[rgba(249,115,22,0.15)] text-orange-300",
  };

  function truncate(s: string | null, len: number): string {
    if (!s) return "—";
    return s.length > len ? s.slice(0, len) + "..." : s;
  }

  function linkedEntity(a: Activity): { label: string; href: string } | null {
    if (a.humanName && a.humanId) return { label: a.humanName, href: `/humans/${a.humanId}` };
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
          av = a.humanName ?? "";
          bv = b.humanName ?? "";
          break;
        case "date":
          av = a.activityDate;
          bv = b.activityDate;
          break;
      }
      return av.localeCompare(bv) * dir;
    });
  });
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

  <!-- Filters -->
  <form method="GET" class="mt-4 flex flex-wrap items-end gap-4 glass-card p-4 mb-6">
    <div>
      <label for="typeFilter" class="block text-sm font-medium text-text-secondary mb-1">Type</label>
      <select id="typeFilter" name="type" class="glass-input px-3 py-2 text-sm">
        <option value="">All</option>
        <option value="email" selected={data.type === "email"}>Email</option>
        <option value="whatsapp_message" selected={data.type === "whatsapp_message"}>WhatsApp</option>
        <option value="online_meeting" selected={data.type === "online_meeting"}>Meeting</option>
        <option value="phone_call" selected={data.type === "phone_call"}>Phone Call</option>
      </select>
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

  <div class="glass-card overflow-hidden">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th class="cursor-pointer select-none" onclick={() => toggleSort("type")}>Type{sortArrow("type")}</th>
          <th class="cursor-pointer select-none" onclick={() => toggleSort("subject")}>Subject{sortArrow("subject")}</th>
          <th class="hidden sm:table-cell">Notes</th>
          <th class="cursor-pointer select-none" onclick={() => toggleSort("linkedTo")}>Linked To{sortArrow("linkedTo")}</th>
          <th class="cursor-pointer select-none" onclick={() => toggleSort("date")}>Date{sortArrow("date")}</th>
        </tr>
      </thead>
      <tbody>
        {#each sortedActivities as activity (activity.id)}
          <tr class="glass-row-hover">
            <td>
              <span class="glass-badge {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
                {activityTypeLabels[activity.type] ?? activity.type}
              </span>
            </td>
            <td class="font-medium">{activity.subject}</td>
            <td class="hidden sm:table-cell text-text-muted max-w-xs truncate">{truncate(activity.notes ?? activity.body, 80)}</td>
            <td>
              {#if linkedEntity(activity)}
                {@const entity = linkedEntity(activity)!}
                <a href={entity.href} class="text-accent hover:text-cyan-300">{entity.label}</a>
              {:else}
                <span class="text-text-muted">—</span>
              {/if}
            </td>
            <td class="text-text-muted">{new Date(activity.activityDate).toLocaleDateString()}</td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="px-6 py-8 text-center text-sm text-text-muted">No activities found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
