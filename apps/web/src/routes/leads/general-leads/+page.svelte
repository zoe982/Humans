<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import Pagination from "$lib/components/Pagination.svelte";
  import { generalLeadStatusLabels, generalLeadSourceLabels } from "$lib/constants/labels";
  import { generalLeadStatusColors, generalLeadSourceColors } from "$lib/constants/colors";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Lead = {
    id: string;
    displayId: string;
    status: string;
    source: string;
    notes: string | null;
    ownerName: string | null;
    convertedHumanDisplayId: string | null;
    convertedHumanId: string | null;
    convertedHumanName: string | null;
    createdAt: string;
  };

  const leads = $derived(data.leads as Lead[]);

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }

  let pendingDeleteId = $state<string | null>(null);
  let deleteFormEl = $state<HTMLFormElement>();
</script>

<svelte:head>
  <title>General Leads - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="General Leads"
    breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "General Leads" }]}
  >
    {#snippet actions()}
      <a href="/leads/general-leads/new" class="btn-primary text-sm">New Lead</a>
    {/snippet}
  </PageHeader>

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <!-- Filters -->
  <form method="GET" class="mt-4 flex flex-wrap gap-3 items-end">
    <div>
      <label for="status" class="block text-xs font-medium text-text-muted mb-1">Status</label>
      <select id="status" name="status" class="glass-input px-3 py-1.5 text-sm" value={data.status}>
        <option value="">All</option>
        <option value="open">Open</option>
        <option value="qualified">Qualified</option>
        <option value="closed_converted">Converted</option>
        <option value="closed_rejected">Rejected</option>
      </select>
    </div>
    <div>
      <label for="source" class="block text-xs font-medium text-text-muted mb-1">Source</label>
      <select id="source" name="source" class="glass-input px-3 py-1.5 text-sm" value={data.source}>
        <option value="">All</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="email">Email</option>
        <option value="direct_referral">Direct Referral</option>
      </select>
    </div>
    <div>
      <label for="q" class="block text-xs font-medium text-text-muted mb-1">Search</label>
      <input id="q" name="q" type="text" class="glass-input px-3 py-1.5 text-sm" placeholder="Code or notes..." value={data.q} />
    </div>
    <Button type="submit" size="sm">Filter</Button>
  </form>

  <!-- Mobile card view -->
  <div class="sm:hidden space-y-3 mt-4">
    {#each leads as lead (lead.id)}
      <a href="/leads/general-leads/{lead.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
        <span class="font-mono text-xs text-text-muted">{lead.displayId}</span>
        <div class="flex items-center justify-between mb-2 mt-1">
          <StatusBadge status={generalLeadStatusLabels[lead.status] ?? lead.status} colorMap={{
            "Open": "badge-blue", "Qualified": "badge-yellow", "Converted": "badge-green", "Rejected": "badge-red",
          }} />
          <StatusBadge status={generalLeadSourceLabels[lead.source] ?? lead.source} colorMap={{
            "WhatsApp": "badge-green", "Email": "badge-blue", "Direct Referral": "badge-purple",
          }} />
        </div>
        {#if lead.ownerName}
          <p class="text-sm text-text-secondary">{lead.ownerName}</p>
        {/if}
        {#if lead.notes}
          <p class="text-sm text-text-muted truncate mt-1">{lead.notes}</p>
        {/if}
        <div class="mt-2 text-xs text-text-muted">{formatDate(lead.createdAt)}</div>
      </a>
    {:else}
      <div class="glass-card p-6 text-center text-sm text-text-muted">No general leads found.</div>
    {/each}
  </div>

  <!-- Desktop table view -->
  <div class="glass-card overflow-hidden hidden sm:block mt-4">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th scope="col">Lead Code</th>
          <th scope="col">Status</th>
          <th scope="col">Source</th>
          <th scope="col">Owner</th>
          <th scope="col">Notes</th>
          <th scope="col">Created</th>
          <th scope="col">Converted Human</th>
          {#if data.userRole === "admin"}
            <th scope="col">Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each leads as lead (lead.id)}
          <tr class="glass-row-hover">
            <td class="font-mono text-sm whitespace-nowrap">
              <a href="/leads/general-leads/{lead.id}" class="text-accent hover:text-[var(--link-hover)]">{lead.displayId}</a>
            </td>
            <td>
              <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {generalLeadStatusColors[lead.status] ?? 'bg-glass text-text-secondary'}">
                {generalLeadStatusLabels[lead.status] ?? lead.status}
              </span>
            </td>
            <td>
              <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {generalLeadSourceColors[lead.source] ?? 'bg-glass text-text-secondary'}">
                {generalLeadSourceLabels[lead.source] ?? lead.source}
              </span>
            </td>
            <td class="text-text-secondary">{lead.ownerName ?? "—"}</td>
            <td class="text-text-muted max-w-xs truncate">{lead.notes ?? "—"}</td>
            <td class="text-text-muted whitespace-nowrap">{formatDate(lead.createdAt)}</td>
            <td>
              {#if lead.convertedHumanId}
                <a href="/humans/{lead.convertedHumanId}" class="text-accent hover:text-[var(--link-hover)] font-mono text-sm">
                  {lead.convertedHumanDisplayId}
                </a>
              {:else}
                <span class="text-text-muted">—</span>
              {/if}
            </td>
            {#if data.userRole === "admin"}
              <td>
                <button type="button" class="text-destructive-foreground hover:opacity-80 text-sm" onclick={() => { pendingDeleteId = lead.id; }}>Delete</button>
              </td>
            {/if}
          </tr>
        {:else}
          <tr>
            <td colspan={data.userRole === "admin" ? 8 : 7} class="px-6 py-8 text-center text-sm text-text-muted">No general leads found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <Pagination page={data.page} limit={data.limit} total={data.total} baseUrl="/leads/general-leads" />
</div>

<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden">
  <input type="hidden" name="id" value={pendingDeleteId ?? ""} />
</form>

<ConfirmDialog
  open={pendingDeleteId !== null}
  message="Are you sure you want to delete this general lead? This cannot be undone."
  onConfirm={() => { deleteFormEl?.requestSubmit(); pendingDeleteId = null; }}
  onCancel={() => { pendingDeleteId = null; }}
/>
