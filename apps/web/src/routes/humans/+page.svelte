<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import { Search } from "lucide-svelte";
  import { statusColors, humanTypeColors } from "$lib/constants/colors";
  import { humanTypeLabels } from "$lib/constants/labels";
  import { displayName as formatDisplayName } from "$lib/utils/format";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type HumanEmail = {
    id: string;
    email: string;
    label: string;
    isPrimary: boolean;
  };

  type Human = {
    id: string;
    displayId: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    status: string;
    emails: HumanEmail[];
    types: string[];
    createdAt: string;
  };

  const humans = $derived(data.humans as Human[]);

  function primaryEmail(h: Human): string {
    const primary = h.emails.find((e) => e.isPrimary);
    return primary?.email ?? h.emails[0]?.email ?? "\u2014";
  }

  const paginationBaseUrl = $derived.by(() => {
    const params = new URLSearchParams();
    if (data.q) params.set("q", data.q);
    const qs = params.toString();
    return `/humans${qs ? `?${qs}` : ""}`;
  });
</script>

<EntityListPage
  title="Humans"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Humans" }]}
  newHref="/humans/new"
  newLabel="Add Human"
  items={humans}
  error={form?.error}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Primary Email" },
    { key: "status", label: "Status" },
    { key: "types", label: "Types" },
    { key: "createdAt", label: "Created" },
  ]}
  deleteAction="?/delete"
  deleteMessage="Are you sure you want to delete this human? This cannot be undone."
  canDelete={data.userRole === "admin"}
  pagination={{ page: data.page, limit: data.limit, total: data.total, baseUrl: paginationBaseUrl }}
>
  {#snippet searchForm()}
    <form method="GET" class="mt-4 mb-6 flex items-center gap-3">
      <div class="relative flex-1">
        <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input type="text" name="q" value={data.q ?? ""} placeholder="Search by name or ID..." class="glass-input w-full pl-9 pr-3 py-2 text-sm" />
      </div>
      <Button type="submit" size="sm">Search</Button>
      {#if data.q}
        <a href="/humans" class="btn-ghost text-sm">Clear</a>
      {/if}
    </form>
  {/snippet}
  {#snippet desktopRow(human)}
    <td class="font-mono text-sm">
      <a href="/humans/{human.id}" class="text-accent hover:text-[var(--link-hover)]">{human.displayId}</a>
    </td>
    <td class="font-medium">
      <a href="/humans/{human.id}" class="text-accent hover:text-[var(--link-hover)]">{formatDisplayName(human)}</a>
    </td>
    <td class="text-text-secondary">{primaryEmail(human)}</td>
    <td>
      <StatusBadge status={human.status ?? "open"} colorMap={statusColors} />
    </td>
    <td>
      <div class="flex gap-1 flex-wrap">
        {#each human.types as t}
          <span class="glass-badge {humanTypeColors[t] ?? 'bg-glass text-text-secondary'}">
            {humanTypeLabels[t] ?? t}
          </span>
        {/each}
      </div>
    </td>
    <td class="text-text-muted">{new Date(human.createdAt).toLocaleDateString()}</td>
  {/snippet}
  {#snippet mobileCard(human)}
    <a href="/humans/{human.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{human.displayId}</span>
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium text-accent">{formatDisplayName(human)}</span>
        <StatusBadge status={human.status ?? "open"} colorMap={statusColors} />
      </div>
      <p class="text-sm text-text-secondary truncate">{primaryEmail(human)}</p>
      <div class="mt-2 flex gap-1 flex-wrap">
        {#each human.types as t}
          <span class="glass-badge text-xs {humanTypeColors[t] ?? 'bg-glass text-text-secondary'}">
            {humanTypeLabels[t] ?? t}
          </span>
        {/each}
      </div>
      {#if data.userRole === "admin"}
        <div class="mt-2 flex justify-end">
          <button type="button" class="text-destructive-foreground hover:opacity-80 text-xs" onclick={(e) => { e.preventDefault(); }}>Delete</button>
        </div>
      {/if}
    </a>
  {/snippet}
</EntityListPage>
