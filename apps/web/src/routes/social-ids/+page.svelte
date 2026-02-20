<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";

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

  let search = $state("");

  const filtered = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return socialIds;
    return socialIds.filter((s) =>
      s.handle.toLowerCase().includes(q) ||
      (s.platformName?.toLowerCase().includes(q)) ||
      (s.humanName?.toLowerCase().includes(q)) ||
      (s.accountName?.toLowerCase().includes(q)) ||
      s.displayId.toLowerCase().includes(q)
    );
  });
</script>

<svelte:head>
  <title>Social Media IDs - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Social Media IDs" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Social Media IDs" }]} />

  <div class="mb-4">
    <input
      type="text"
      placeholder="Search handles, platforms, humans, accounts..."
      bind:value={search}
      class="glass-input w-full px-3 py-2 text-sm sm:max-w-sm"
    />
  </div>

  <div class="glass-card overflow-hidden">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th>ID</th>
          <th>Handle</th>
          <th>Platform</th>
          <th>Human</th>
          <th>Account</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as sid (sid.id)}
          <tr class="glass-row-hover">
            <td class="font-mono text-sm"><a href="/social-ids/{sid.id}" class="text-accent hover:text-cyan-300">{sid.displayId}</a></td>
            <td class="font-medium">{sid.handle}</td>
            <td>
              {#if sid.platformName}
                <span class="glass-badge bg-glass text-text-secondary">{sid.platformName}</span>
              {:else}
                <span class="text-text-muted">—</span>
              {/if}
            </td>
            <td>
              {#if sid.humanId}
                <a href="/humans/{sid.humanId}" class="text-accent hover:text-cyan-300">{sid.humanName ?? "—"}</a>
                {#if sid.humanDisplayId}
                  <span class="ml-1 text-xs text-text-muted">{sid.humanDisplayId}</span>
                {/if}
              {:else}
                <span class="text-text-muted">—</span>
              {/if}
            </td>
            <td>
              {#if sid.accountId}
                <a href="/accounts/{sid.accountId}" class="text-accent hover:text-cyan-300">{sid.accountName ?? "—"}</a>
                {#if sid.accountDisplayId}
                  <span class="ml-1 text-xs text-text-muted">{sid.accountDisplayId}</span>
                {/if}
              {:else}
                <span class="text-text-muted">—</span>
              {/if}
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="px-6 py-8 text-center text-sm text-text-muted">{search ? "No matching social IDs." : "No social IDs found."}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
