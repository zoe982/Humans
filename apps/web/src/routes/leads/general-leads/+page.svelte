<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import LeadScoreBadge from "$lib/components/LeadScoreBadge.svelte";
  import { getLeadScoreBand } from "@humans/shared";
  import { generalLeadStatusLabels } from "$lib/constants/labels";
  import { generalLeadStatusColors } from "$lib/constants/colors";
  import { resolve } from "$app/paths";
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
    scoreTotal: number | null;
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
    { key: "owner", label: "Owner" },
    { key: "notes", label: "Notes" },
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
      {#if lead.scoreTotal != null}
        <LeadScoreBadge score={lead.scoreTotal} band={getLeadScoreBand(lead.scoreTotal)} />
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
    <td>
      <!-- eslint-disable-next-line security/detect-object-injection -->
      <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {generalLeadStatusColors[lead.status] ?? 'bg-glass text-text-secondary'}">
        <!-- eslint-disable-next-line security/detect-object-injection -->
        {generalLeadStatusLabels[lead.status] ?? lead.status}
      </span>
    </td>
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
      {#if lead.notes}
        <p class="text-sm text-text-muted truncate mt-1">{lead.notes}</p>
      {/if}
      <div class="mt-2 text-xs text-text-muted">{new Date(lead.createdAt).toLocaleDateString()}</div>
    </a>
  {/snippet}
</EntityListPage>
