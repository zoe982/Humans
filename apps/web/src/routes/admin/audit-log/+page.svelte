<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";

  let { data }: { data: PageData } = $props();

  type LogEntry = {
    id: string;
    colleagueId: string | null;
    colleagueName: string | null;
    action: string;
    entityType: string;
    entityId: string;
    ipAddress: string | null;
    createdAt: string;
  };

  const logs = $derived(data.logs as LogEntry[]);
</script>

<svelte:head>
  <title>Audit Log - Admin - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Audit Log"
    breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit Log" }]}
  />

  <div class="glass-card overflow-hidden">
    <table class="min-w-full text-sm">
      <thead class="glass-thead">
        <tr>
          <th>Time</th>
          <th>User</th>
          <th>Action</th>
          <th>Entity</th>
          <th>IP</th>
        </tr>
      </thead>
      <tbody>
        {#each logs as log (log.id)}
          <tr class="glass-row-hover">
            <td class="text-text-muted font-mono text-xs whitespace-nowrap">
              {new Date(log.createdAt).toLocaleString()}
            </td>
            <td>
              {#if log.colleagueName}
                <span class="text-text-primary" title={log.colleagueId ?? ""}>{log.colleagueName}</span>
              {:else if log.colleagueId}
                <span class="font-mono text-xs text-text-muted" title={log.colleagueId}>{log.colleagueId.slice(0, 8)}...</span>
              {:else}
                <span class="text-text-muted">—</span>
              {/if}
            </td>
            <td>
              <span class="glass-badge bg-glass text-text-secondary">{log.action}</span>
            </td>
            <td>
              <span class="font-medium">{log.entityType}</span>
              <span class="ml-1 font-mono text-xs text-text-muted">{log.entityId.slice(0, 8)}...</span>
            </td>
            <td class="text-text-muted font-mono text-xs">{log.ipAddress ?? "—"}</td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="px-4 py-8 text-center text-text-muted">No audit log entries yet.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="mt-4 flex justify-between">
    {#if data.offset > 0}
      <a href="?offset={data.offset - data.limit}" class="text-sm text-accent hover:text-[var(--link-hover)]">&larr; Previous</a>
    {:else}
      <span></span>
    {/if}
    {#if logs.length === data.limit}
      <a href="?offset={data.offset + data.limit}" class="text-sm text-accent hover:text-[var(--link-hover)]">Next &rarr;</a>
    {/if}
  </div>
</div>
