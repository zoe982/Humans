<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import { statusColors, humanTypeColors } from "$lib/constants/colors";
  import { humanTypeLabels } from "$lib/constants/labels";
  import { displayName as formatDisplayName, formatDate } from "$lib/utils/format";
  import { resolve } from "$app/paths";
  import { browser } from "$app/environment";
  import { getStore } from "$lib/data/stores.svelte";

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

  const humans = $derived((browser ? getStore<Human>("humans").items : data.humans) as Human[]);

  function primaryEmail(h: Human): string {
    const primary = h.emails.find((e) => e.isPrimary);
    return primary?.email ?? h.emails[0]?.email ?? "\u2014";
  }

  function searchFilter(h: Human, query: string): boolean {
    const name = formatDisplayName(h).toLowerCase();
    const id = h.displayId.toLowerCase();
    const email = primaryEmail(h).toLowerCase();
    return name.includes(query) || id.includes(query) || email.includes(query);
  }
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
  onDelete={(id) => getStore("humans").removeItem(id)}
  {searchFilter}
  clientPageSize={25}
>
  {#snippet desktopRow(human)}
    <td class="font-mono text-sm whitespace-nowrap">
      <a href={resolve(`/humans/${human.id}`)} class="text-accent hover:text-[var(--link-hover)]">{human.displayId}</a>
    </td>
    <td class="font-medium">
      <a href={resolve(`/humans/${human.id}`)} class="text-accent hover:text-[var(--link-hover)]">{formatDisplayName(human)}</a>
    </td>
    <td class="text-text-secondary">{primaryEmail(human)}</td>
    <td>
      <StatusBadge status={human.status ?? "open"} colorMap={statusColors} />
    </td>
    <td>
      <div class="flex gap-1 flex-wrap">
        {#each human.types as t (t)}
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <span class="glass-badge {humanTypeColors[t] ?? 'bg-glass text-text-secondary'}">
            <!-- eslint-disable-next-line security/detect-object-injection -->
            {humanTypeLabels[t] ?? t}
          </span>
        {/each}
      </div>
    </td>
    <td class="text-text-muted">{formatDate(human.createdAt)}</td>
  {/snippet}
  {#snippet mobileCard(human)}
    <a href={resolve(`/humans/${human.id}`)} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{human.displayId}</span>
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium text-accent">{formatDisplayName(human)}</span>
        <StatusBadge status={human.status ?? "open"} colorMap={statusColors} />
      </div>
      <p class="text-sm text-text-secondary truncate">{primaryEmail(human)}</p>
      <div class="mt-2 flex gap-1 flex-wrap">
        {#each human.types as t (t)}
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <span class="glass-badge text-xs {humanTypeColors[t] ?? 'bg-glass text-text-secondary'}">
            <!-- eslint-disable-next-line security/detect-object-injection -->
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
