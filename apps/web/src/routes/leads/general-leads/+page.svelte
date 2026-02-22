<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import { Search } from "lucide-svelte";
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

  const paginationBaseUrl = $derived.by(() => {
    const params = new URLSearchParams();
    if (data.status) params.set("status", data.status);
    if (data.source) params.set("source", data.source);
    if (data.q) params.set("q", data.q);
    const qs = params.toString();
    return `/leads/general-leads${qs ? `?${qs}` : ""}`;
  });
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
    { key: "status", label: "Status" },
    { key: "source", label: "Source" },
    { key: "owner", label: "Owner" },
    { key: "notes", label: "Notes" },
    { key: "createdAt", label: "Created" },
    { key: "convertedHuman", label: "Converted Human" },
  ]}
  deleteAction="?/delete"
  deleteMessage="Are you sure you want to delete this general lead? This cannot be undone."
  canDelete={data.userRole === "admin"}
  pagination={{ page: data.page, limit: data.limit, total: data.total, baseUrl: paginationBaseUrl }}
>
  {#snippet searchForm()}
    <form method="GET" class="mt-4 mb-6 flex flex-wrap gap-3 items-end">
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
      <div class="relative flex-1 min-w-[200px]">
        <label for="q" class="block text-xs font-medium text-text-muted mb-1">Search</label>
        <div class="relative">
          <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input id="q" name="q" type="text" class="glass-input w-full pl-9 pr-3 py-1.5 text-sm" placeholder="Code or notes..." value={data.q} />
        </div>
      </div>
      <Button type="submit" size="sm">Filter</Button>
      {#if data.status || data.source || data.q}
        <a href="/leads/general-leads" class="btn-ghost text-sm">Clear</a>
      {/if}
    </form>
  {/snippet}
  {#snippet desktopRow(lead)}
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
    <td class="text-text-secondary">{lead.ownerName ?? "\u2014"}</td>
    <td class="text-text-muted max-w-xs truncate">{lead.notes ?? "\u2014"}</td>
    <td class="text-text-muted whitespace-nowrap">{new Date(lead.createdAt).toLocaleDateString()}</td>
    <td>
      {#if lead.convertedHumanId}
        <a href="/humans/{lead.convertedHumanId}" class="text-accent hover:text-[var(--link-hover)] font-mono text-sm">
          {lead.convertedHumanDisplayId}
        </a>
      {:else}
        <span class="text-text-muted">{"\u2014"}</span>
      {/if}
    </td>
  {/snippet}
  {#snippet mobileCard(lead)}
    <a href="/leads/general-leads/{lead.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{lead.displayId}</span>
      <div class="flex items-center justify-between mb-2 mt-1">
        <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {generalLeadStatusColors[lead.status] ?? 'bg-glass text-text-secondary'}">
          {generalLeadStatusLabels[lead.status] ?? lead.status}
        </span>
        <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {generalLeadSourceColors[lead.source] ?? 'bg-glass text-text-secondary'}">
          {generalLeadSourceLabels[lead.source] ?? lead.source}
        </span>
      </div>
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
