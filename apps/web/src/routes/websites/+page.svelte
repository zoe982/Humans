<script lang="ts">
  import type { PageData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import { resolve } from "$app/paths";

  let { data }: { data: PageData } = $props();

  type Website = {
    id: string;
    displayId: string;
    url: string;
    humanId: string | null;
    humanName: string | null;
    humanDisplayId: string | null;
    accountId: string | null;
    accountName: string | null;
    accountDisplayId: string | null;
  };

  const websites = $derived(data.websites as Website[]);
</script>

<EntityListPage
  title="Websites"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports", href: "/reports" }, { label: "Websites" }]}
  newHref="/websites/new"
  newLabel="Add Website"
  items={websites}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "url", label: "URL" },
    { key: "human", label: "Human" },
    { key: "account", label: "Account" },
  ]}
  searchFilter={(w, q) =>
    w.url.toLowerCase().includes(q) ||
    (w.humanName?.toLowerCase().includes(q) ?? false) ||
    (w.accountName?.toLowerCase().includes(q) ?? false) ||
    w.displayId.toLowerCase().includes(q)
  }
  searchPlaceholder="Search URLs, humans, accounts..."
>
  {#snippet desktopRow(w)}
    <td class="font-mono text-sm"><a href={resolve(`/websites/${w.id}`)} class="text-accent hover:text-[var(--link-hover)]">{w.displayId}</a></td>
    <td class="font-medium">
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href={w.url} target="_blank" rel="noopener noreferrer" class="text-accent hover:text-[var(--link-hover)]">{w.url}</a>
    </td>
    <td>
      {#if w.humanId}
        <a href={resolve(`/humans/${w.humanId}`)} class="text-accent hover:text-[var(--link-hover)]">{w.humanName ?? "\u2014"}</a>
        {#if w.humanDisplayId}
          <span class="ml-1 text-xs text-text-muted">{w.humanDisplayId}</span>
        {/if}
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
    <td>
      {#if w.accountId}
        <a href={resolve(`/accounts/${w.accountId}`)} class="text-accent hover:text-[var(--link-hover)]">{w.accountName ?? "\u2014"}</a>
        {#if w.accountDisplayId}
          <span class="ml-1 text-xs text-text-muted">{w.accountDisplayId}</span>
        {/if}
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
  {/snippet}
  {#snippet mobileCard(w)}
    <a href={resolve(`/websites/${w.id}`)} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{w.displayId}</span>
      <div class="font-medium text-accent">{w.url}</div>
      <div class="text-sm text-text-secondary">
        {#if w.humanName}
          <span>{w.humanName}</span>
        {/if}
        {#if w.accountName}
          <span class="ml-2">{w.accountName}</span>
        {/if}
      </div>
    </a>
  {/snippet}
</EntityListPage>
