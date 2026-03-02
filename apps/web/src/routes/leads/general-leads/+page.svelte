<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import LeadScoreBadge from "$lib/components/LeadScoreBadge.svelte";
  import { getLeadScoreBand, generalLeadStatuses } from "@humans/shared";
  import { generalLeadStatusLabels } from "$lib/constants/labels";
  import { generalLeadStatusColors } from "$lib/constants/colors";
  import { toast } from "svelte-sonner";
  import { SvelteMap } from "svelte/reactivity";
  import { resolve } from "$app/paths";
  import { formatDate } from "$lib/utils/format";
  import { enhance } from "$app/forms";
  import InlineNoteEditor from "$lib/components/InlineNoteEditor.svelte";
  import { api } from "$lib/api";
  import { Loader2 } from "lucide-svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let importing = $state(false);

  type Lead = {
    id: string;
    displayId: string;
    status: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    notes: string | null;
    ownerName: string | null;
    channel: string | null;
    source: string | null;
    scoreTotal: number | null;
    nextAction: { type: string | null; description: string | null; dueDate: string | null } | null;
    convertedHumanDisplayId: string | null;
    convertedHumanId: string | null;
    convertedHumanName: string | null;
    createdAt: string;
  };

  const allLeads = $derived(data.leads as Lead[]);

  let filterStatus = $state("");
  let filterQ = $state("");
  let showImportPopover = $state(false);
  let importInputEl = $state<HTMLInputElement | undefined>(undefined);

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

  function openImportPopover() {
    showImportPopover = true;
    // Focus the input on the next frame once it is mounted
    requestAnimationFrame(() => {
      importInputEl?.focus();
    });
  }

  function closeImportPopover() {
    showImportPopover = false;
  }

  function handleImportKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") closeImportPopover();
  }

  // Inline status editing
  let statusOverrides = new SvelteMap<string, string>();

  const badgeStyleMap: Record<string, { bg: string; color: string }> = {
    "badge-blue":   { bg: "var(--badge-blue-bg)",   color: "var(--badge-blue-text)" },
    "badge-green":  { bg: "var(--badge-green-bg)",  color: "var(--badge-green-text)" },
    "badge-red":    { bg: "var(--badge-red-bg)",    color: "var(--badge-red-text)" },
    "badge-yellow": { bg: "var(--badge-yellow-bg)", color: "var(--badge-yellow-text)" },
    "badge-purple": { bg: "var(--badge-purple-bg)", color: "var(--badge-purple-text)" },
    "badge-orange": { bg: "var(--badge-orange-bg)", color: "var(--badge-orange-text)" },
  };

  function getEffectiveStatus(lead: Lead): string {
    return statusOverrides.get(lead.id) ?? lead.status;
  }

  function getStatusBadgeStyle(lead: Lead): string {
    const effectiveStatus = getEffectiveStatus(lead);
    // eslint-disable-next-line security/detect-object-injection
    const badgeKey = generalLeadStatusColors[effectiveStatus];
    // eslint-disable-next-line security/detect-object-injection
    const style = badgeKey ? badgeStyleMap[badgeKey] : null;
    if (!style) return "";
    return `background-color: ${style.bg}; color: ${style.color};`;
  }

  function isOverdue(dueDate: string | null): boolean {
    if (dueDate == null) return false;
    return new Date(dueDate) < new Date();
  }

  async function handleInlineStatusChange(lead: Lead, newStatus: string) {
    // closed_lost requires loss reason — redirect to detail page
    if (newStatus === "closed_lost") {
      toast.info("Loss reason required \u2014 please update status on the detail page");
      return;
    }

    const prev = getEffectiveStatus(lead);
    statusOverrides.set(lead.id, newStatus);

    try {
      await api(`/api/general-leads/${lead.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success("Status updated");
    } catch {
      if (prev === lead.status) {
        statusOverrides.delete(lead.id);
      } else {
        statusOverrides.set(lead.id, prev);
      }
      toast.error("Failed to update status");
    }
  }
</script>

<EntityListPage
  title="General Leads"
  breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "General Leads" }]}
  items={leads}
  error={form?.error}
  columns={[
    { key: "displayId", label: "Lead Code" },
    { key: "name", label: "Name" },
    { key: "score", label: "Score" },
    { key: "status", label: "Status" },
    { key: "channel", label: "Channel" },
    { key: "source", label: "Source" },
    { key: "owner", label: "Owner" },
    { key: "notes", label: "Notes" },
    { key: "nextAction", label: "Next Action" },
    { key: "createdAt", label: "Created" },
    { key: "convertedHuman", label: "Linked Human" },
  ]}
  clientPageSize={25}
  canDelete={false}
>
  {#snippet headerAction()}
    <div class="flex items-center gap-2">
      <!-- Import from Front — ghost button with anchored popover -->
      <div class="relative">
        <button
          type="button"
          class="btn-ghost"
          onclick={openImportPopover}
          aria-expanded={showImportPopover}
          aria-haspopup="true"
        >
          Import from Front
        </button>

        {#if showImportPopover}
          <!-- Backdrop to catch outside clicks -->
          <div
            class="fixed inset-0 z-10"
            role="presentation"
            onclick={closeImportPopover}
            onkeydown={handleImportKeydown}
          ></div>

          <!-- Popover panel — anchored to the button, z-20 above backdrop -->
          <div
            class="absolute right-0 top-full mt-2 z-20 glass-popover glass-dropdown-animate w-72 p-4"
            role="dialog"
            aria-label="Import from Front"
          >
            <p class="text-xs font-medium text-text-secondary mb-3">
              Import a Front conversation or message as a lead
            </p>
            <form
              method="POST"
              action="?/importFromFront"
              use:enhance={() => {
                importing = true;
                return async ({ result, update }) => {
                  importing = false;
                  if (result.type === "redirect" || (result.type === "success")) {
                    closeImportPopover();
                  }
                  await update();
                };
              }}
            >
              <div class="flex gap-2 items-center">
                <input
                  bind:this={importInputEl}
                  id="frontId"
                  name="frontId"
                  type="text"
                  class="glass-input flex-1 min-w-0 py-1.5 text-sm font-mono"
                  placeholder="msg_xxx or cnv_xxx"
                  onkeydown={handleImportKeydown}
                  autocomplete="off"
                  spellcheck={false}
                  disabled={importing}
                />
                <button type="submit" class="btn-primary shrink-0 py-1.5 px-3 text-sm" disabled={importing}>
                  {#if importing}
                    <Loader2 size={14} class="inline animate-spin -mt-0.5 mr-1" />
                  {/if}
                  Import
                </button>
              </div>
              {#if form?.importError}
                <p class="mt-2 text-xs text-[#fca5a5]">{form.importError}</p>
              {/if}
            </form>
          </div>
        {/if}
      </div>

      <a href={resolve("/leads/general-leads/new")} class="btn-primary">New Lead</a>
    </div>
  {/snippet}
  {#snippet searchForm()}
    <div class="mt-4 mb-6 flex flex-wrap gap-3 items-end">
      <div>
        <label for="status" class="block text-xs font-medium text-text-muted mb-1">Status</label>
        <select id="status" class="glass-input px-3 py-1.5 text-sm" bind:value={filterStatus}>
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="pending_response">Pending Response</option>
          <option value="qualified">Qualified</option>
          <option value="closed_lost">Closed - Lost</option>
          <option value="closed_converted">Closed - Converted</option>
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
      {#if lead.scoreTotal != null}
        <LeadScoreBadge score={lead.scoreTotal} band={getLeadScoreBand(lead.scoreTotal)} />
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
    <td>
      <select
        class="glass-select-badge"
        style={getStatusBadgeStyle(lead)}
        value={getEffectiveStatus(lead)}
        onchange={(e) => {
          const target = e.currentTarget;
          void handleInlineStatusChange(lead, target.value);
        }}
      >
        {#each generalLeadStatuses as status, i (i)}
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <option value={status}>{generalLeadStatusLabels[status] ?? status}</option>
        {/each}
      </select>
    </td>
    <td class="text-text-secondary text-sm">{lead.channel ?? "\u2014"}</td>
    <td class="text-text-secondary text-sm">{lead.source ?? "\u2014"}</td>
    <td class="text-text-secondary">{lead.ownerName ?? "\u2014"}</td>
    <td>
      <InlineNoteEditor
        value={lead.notes}
        onSave={async (note) => {
          await api(`/api/general-leads/${lead.id}`, {
            method: "PATCH",
            body: JSON.stringify({ notes: note }),
            headers: { "Content-Type": "application/json" },
          });
          lead.notes = note;
        }}
      />
    </td>
    <td class="text-sm max-w-[200px]">
      {#if lead.nextAction}
        <div class="text-text-primary truncate">
          {#if lead.nextAction.type}{lead.nextAction.type}: {/if}{lead.nextAction.description ?? ""}
        </div>
        {#if lead.nextAction.dueDate}
          <div class="text-xs {isOverdue(lead.nextAction.dueDate) ? 'text-[var(--badge-red-text)]' : 'text-text-muted'}">
            Due {formatDate(lead.nextAction.dueDate)}
          </div>
        {/if}
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
    <td class="text-text-muted whitespace-nowrap">{formatDate(lead.createdAt)}</td>
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
        <div class="flex items-center gap-2">
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {generalLeadStatusColors[lead.status] ?? 'bg-glass text-text-secondary'}">
            <!-- eslint-disable-next-line security/detect-object-injection -->
            {generalLeadStatusLabels[lead.status] ?? lead.status}
          </span>
          {#if lead.scoreTotal != null}
            <LeadScoreBadge score={lead.scoreTotal} band={getLeadScoreBand(lead.scoreTotal)} />
          {/if}
        </div>
      </div>
      <p class="text-sm font-medium text-text-primary">{[lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ")}</p>
      {#if lead.ownerName}
        <p class="text-sm text-text-secondary">{lead.ownerName}</p>
      {/if}
      {#if lead.channel || lead.source}
        <p class="text-xs text-text-secondary mt-1">
          {#if lead.channel}{lead.channel}{/if}
          {#if lead.channel && lead.source} &middot; {/if}
          {#if lead.source}{lead.source}{/if}
        </p>
      {/if}
      {#if lead.notes}
        <p class="text-sm text-text-muted truncate mt-1">{lead.notes}</p>
      {/if}
      {#if lead.nextAction}
        <p class="text-xs text-text-muted mt-1 truncate">
          Next: {#if lead.nextAction.type}{lead.nextAction.type}: {/if}{lead.nextAction.description ?? ""}
        </p>
      {/if}
      <div class="mt-2 text-xs text-text-muted">{formatDate(lead.createdAt)}</div>
    </a>
  {/snippet}
</EntityListPage>
