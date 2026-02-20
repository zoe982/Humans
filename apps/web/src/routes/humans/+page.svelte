<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import Pagination from "$lib/components/Pagination.svelte";
  import { statusColors, humanTypeColors } from "$lib/constants/colors";
  import { humanTypeLabels } from "$lib/constants/labels";
  import { displayName as formatDisplayName } from "$lib/utils/format";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type HumanEmail = {
    id: string;
    email: string;
    label: string;
    isPrimary: boolean;
  };

  type Human = {
    id: string;
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

  let pendingDeleteId = $state<string | null>(null);
  let deleteFormEl = $state<HTMLFormElement>();
</script>

<svelte:head>
  <title>Humans - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Humans" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Humans" }]}>
    {#snippet action()}
      <a href="/humans/new" class="btn-primary">Add Human</a>
    {/snippet}
  </PageHeader>

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <!-- Mobile card view -->
  <div class="sm:hidden space-y-3">
    {#each humans as human (human.id)}
      <a href="/humans/{human.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
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
            <button type="button" class="text-red-400 hover:text-red-300 text-xs" onclick={(e) => { e.preventDefault(); pendingDeleteId = human.id; }}>Delete</button>
          </div>
        {/if}
      </a>
    {:else}
      <div class="glass-card p-6 text-center text-sm text-text-muted">No humans found.</div>
    {/each}
  </div>

  <!-- Desktop table view -->
  <div class="glass-card overflow-hidden hidden sm:block">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Primary Email</th>
          <th scope="col">Status</th>
          <th scope="col">Types</th>
          <th scope="col">Created</th>
          {#if data.userRole === "admin"}
            <th scope="col">Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each humans as human (human.id)}
          <tr class="glass-row-hover">
            <td class="font-medium">
              <a href="/humans/{human.id}" class="text-accent hover:text-cyan-300">{formatDisplayName(human)}</a>
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
            {#if data.userRole === "admin"}
              <td>
                <button type="button" class="text-red-400 hover:text-red-300 text-sm" onclick={() => { pendingDeleteId = human.id; }}>Delete</button>
              </td>
            {/if}
          </tr>
        {:else}
          <tr>
            <td colspan={data.userRole === "admin" ? 6 : 5} class="px-6 py-8 text-center text-sm text-text-muted">No humans found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <Pagination page={data.page} limit={data.limit} total={data.total} baseUrl="/humans" />
</div>

<!-- Hidden delete form -->
<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden">
  <input type="hidden" name="id" value={pendingDeleteId ?? ""} />
</form>

<ConfirmDialog
  open={pendingDeleteId !== null}
  message="Are you sure you want to delete this human? This cannot be undone."
  onConfirm={() => { deleteFormEl?.requestSubmit(); pendingDeleteId = null; }}
  onCancel={() => { pendingDeleteId = null; }}
/>
