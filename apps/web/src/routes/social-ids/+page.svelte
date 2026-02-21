<script lang="ts">
  import type { PageData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";

  let { data }: { data: PageData } = $props();

  type SocialId = {
    id: string;
    displayId: string;
    handle: string;
    platformId: string | null;
    platformName: string | null;
    humanId: string | null;
    humanName: string | null;
    humanDisplayId: string | null;
    accountId: string | null;
    accountName: string | null;
    accountDisplayId: string | null;
  };

  const socialIds = $derived(data.socialIds as SocialId[]);
</script>

<EntityListPage
  title="Social Media IDs"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports", href: "/reports" }, { label: "Social Media IDs" }]}
  newHref="/social-ids/new"
  newLabel="Add Social ID"
  items={socialIds}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "handle", label: "Handle" },
    { key: "platform", label: "Platform" },
    { key: "human", label: "Human" },
    { key: "account", label: "Account" },
  ]}
  searchFilter={(s, q) =>
    s.handle.toLowerCase().includes(q) ||
    (s.platformName?.toLowerCase().includes(q) ?? false) ||
    (s.humanName?.toLowerCase().includes(q) ?? false) ||
    (s.accountName?.toLowerCase().includes(q) ?? false) ||
    s.displayId.toLowerCase().includes(q)
  }
  searchPlaceholder="Search handles, platforms, humans, accounts..."
>
  {#snippet desktopRow(sid)}
    <td class="font-mono text-sm"><a href="/social-ids/{sid.id}" class="text-accent hover:text-cyan-300">{sid.displayId}</a></td>
    <td class="font-medium">{sid.handle}</td>
    <td>
      {#if sid.platformName}
        <span class="glass-badge bg-glass text-text-secondary">{sid.platformName}</span>
      {:else}
        <span class="text-text-muted">\u2014</span>
      {/if}
    </td>
    <td>
      {#if sid.humanId}
        <a href="/humans/{sid.humanId}" class="text-accent hover:text-cyan-300">{sid.humanName ?? "\u2014"}</a>
        {#if sid.humanDisplayId}
          <span class="ml-1 text-xs text-text-muted">{sid.humanDisplayId}</span>
        {/if}
      {:else}
        <span class="text-text-muted">\u2014</span>
      {/if}
    </td>
    <td>
      {#if sid.accountId}
        <a href="/accounts/{sid.accountId}" class="text-accent hover:text-cyan-300">{sid.accountName ?? "\u2014"}</a>
        {#if sid.accountDisplayId}
          <span class="ml-1 text-xs text-text-muted">{sid.accountDisplayId}</span>
        {/if}
      {:else}
        <span class="text-text-muted">\u2014</span>
      {/if}
    </td>
  {/snippet}
  {#snippet mobileCard(sid)}
    <a href="/social-ids/{sid.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{sid.displayId}</span>
      <div class="font-medium text-accent">{sid.handle}</div>
      <div class="text-sm text-text-secondary">
        {#if sid.platformName}
          <span class="glass-badge text-xs bg-glass text-text-secondary">{sid.platformName}</span>
        {/if}
        {#if sid.humanName}
          <span class="ml-2">{sid.humanName}</span>
        {/if}
      </div>
    </a>
  {/snippet}
</EntityListPage>
