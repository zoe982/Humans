<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  type LogEntry = {
    id: string;
    userId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    ipAddress: string | null;
    createdAt: string;
  };

  const logs = $derived(data.logs as LogEntry[]);
</script>

<svelte:head>
  <title>Audit Log - Admin - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <div>
    <a href="/admin" class="text-sm text-gray-500 hover:text-gray-700">← Admin</a>
    <h1 class="mt-1 text-2xl font-bold text-gray-900">Audit Log</h1>
  </div>

  <div class="mt-6 overflow-hidden rounded-lg bg-white shadow">
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Time</th>
          <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
          <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Entity</th>
          <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">IP</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        {#each logs as log (log.id)}
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
              {new Date(log.createdAt).toLocaleString()}
            </td>
            <td class="px-4 py-3">
              <span class="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">{log.action}</span>
            </td>
            <td class="px-4 py-3 text-gray-700">
              <span class="font-medium">{log.entityType}</span>
              <span class="ml-1 font-mono text-xs text-gray-400">{log.entityId.slice(0, 8)}…</span>
            </td>
            <td class="px-4 py-3 text-gray-500 font-mono text-xs">{log.ipAddress ?? "—"}</td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="px-4 py-8 text-center text-gray-500">No audit log entries yet.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="mt-4 flex justify-between">
    {#if data.offset > 0}
      <a href="?offset={data.offset - data.limit}" class="text-sm text-blue-700 hover:underline">← Previous</a>
    {:else}
      <span></span>
    {/if}
    {#if logs.length === data.limit}
      <a href="?offset={data.offset + data.limit}" class="text-sm text-blue-700 hover:underline">Next →</a>
    {/if}
  </div>
</div>
