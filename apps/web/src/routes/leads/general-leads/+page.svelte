<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import { generalLeadStatusLabels } from "$lib/constants/labels";
  import { generalLeadStatusColors } from "$lib/constants/colors";
  import { resolve } from "$app/paths";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Lead = {
    id: string;
    displayId: string;
    status: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    notes: string | null;
    ownerName: string | null;
    convertedHumanDisplayId: string | null;
    convertedHumanId: string | null;
    convertedHumanName: string | null;
    createdAt: string;
  };

  const allLeads = $derived(data.leads as Lead[]);

  let filterStatus = $state("");
  let filterQ = $state("");

  const leads = $derived(
    allLeads.filter((lead) => {
      if (filterStatus && lead.status !== filterStatus) return false;
      if (filterQ) {
        const q = filterQ.trim().toLowerCase();
        const text = [lead.displayId, lead.firstName, lead.middleName, lead.lastName, lead.ownerName, lead.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    }),
  );
</script>

<EntityListPage
  title="General Leads"
  breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "General Leads" }]}
  newHref="/leads/general-leads/new"
  newLabel="New Lead"
  items={leads}
  error={form?.error}
  columns={[
    { key: "displayId", label: "Lead Code" },
    { key: "name", label: "Name" },
    { key: "status", label: "Status" },
    { key: "owner", label: "Owner" },
    { key: "notes", label: "Notes" },
    { key: "createdAt", label: "Created" },
    { key: "convertedHuman", label: "Converted Human" },
  ]}
  clientPageSize={25}
  deleteAction="?/delete"
  deleteMessage="Are you sure you want to delete this general lead? This cannot be undone."
  canDelete={data.userRole === "admin"}
>
  {#snippet searchForm()}
    <div class="mt-4 mb-6 flex flex-wrap gap-3 items-end">
      <div>
        <label for="status" class="block text-xs font-medium text-text-muted mb-1">Status</label>
        <select id="status" class="glass-input px-3 py-1.5 text-sm" bind:value={filterStatus}>
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="qualified">Qualified</option>
          <option value="closed_converted">Converted</option>
          <option value="closed_rejected">Rejected</option>
        </select>
      </div>
      <div class="relative flex-1 min-w-[200px]">
        <label for="q" class="block text-xs font-medium text-text-muted mb-1">Search</label>
        <input id="q" type="text" class="glass-input w-full px-3 py-1.5 text-sm" placeholder="Code, name, or notes..." bind:value={filterQ} />
      </div>
      {#if filterStatus || filterQ}
        <button type="button" class="btn-ghost text-sm" onclick={() => { filterStatus = ""; filterQ = ""; }}>Clear</button>
      {/if}
    </div>
  {/snippet}
  {#snippet desktopRow(lead)}
    <td class="font-mono text-sm whitespace-nowrap">
      <a href={resolve(`/leads/general-leads/${lead.id}`)} class="text-accent hover:text-[var(--link-hover)]">{lead.displayId}</a>
    </td>
    <td class="text-text-primary text-sm">{[lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ")}</td>
    <td>
      <!-- eslint-disable-next-line security/detect-object-injection -->
      <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {generalLeadStatusColors[lead.status] ?? 'bg-glass text-text-secondary'}">
        <!-- eslint-disable-next-line security/detect-object-injection -->
        {generalLeadStatusLabels[lead.status] ?? lead.status}
      </span>
    </td>
    <td class="text-text-secondary">{lead.ownerName ?? "\u2014"}</td>
    <td class="text-text-muted max-w-xs truncate">{lead.notes ?? "\u2014"}</td>
    <td class="text-text-muted whitespace-nowrap">{new Date(lead.createdAt).toLocaleDateString()}</td>
    <td>
      {#if lead.convertedHumanId}
        <a href={resolve(`/humans/${lead.convertedHumanId}`)} class="text-accent hover:text-[var(--link-hover)] font-mono text-sm">
          {lead.convertedHumanDisplayId}
        </a>
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
  {/snippet}
  {#snippet mobileCard(lead)}
    <a href={resolve(`/leads/general-leads/${lead.id}`)} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{lead.displayId}</span>
      <div class="flex items-center justify-between mb-2 mt-1">
        <!-- eslint-disable-next-line security/detect-object-injection -->
        <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {generalLeadStatusColors[lead.status] ?? 'bg-glass text-text-secondary'}">
          <!-- eslint-disable-next-line security/detect-object-injection -->
          {generalLeadStatusLabels[lead.status] ?? lead.status}
        </span>
      </div>
      <p class="text-sm font-medium text-text-primary">{[lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ")}</p>
      {#if lead.ownerName}
        <p class="text-sm text-text-secondary">{lead.ownerName}</p>
      {/if}
      {#if lead.notes}
        <p class="text-sm text-text-muted truncate mt-1">{lead.notes}</p>
      {/if}
      <div class="mt-2 text-xs text-text-muted">{new Date(lead.createdAt).toLocaleDateString()}</div>
    </a>
  {/snippet}
</EntityListPage>
