<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import HighlightText from "$lib/components/HighlightText.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { invalidateAll } from "$app/navigation";
  import { api } from "$lib/api";
  import { generalLeadStatusColors, generalLeadSourceColors, activityTypeColors } from "$lib/constants/colors";
  import { generalLeadStatusLabels, generalLeadSourceLabels, activityTypeLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Lead = {
    id: string;
    displayId: string;
    status: string;
    source: string;
    notes: string | null;
    rejectReason: string | null;
    ownerName: string | null;
    ownerId: string | null;
    convertedHumanId: string | null;
    convertedHumanDisplayId: string | null;
    convertedHumanName: string | null;
    activities: Activity[];
    createdAt: string;
    updatedAt: string;
  };

  type Activity = {
    id: string;
    type: string;
    subject: string;
    notes: string | null;
    body: string | null;
    activityDate: string;
    createdAt: string;
  };

  const lead = $derived(data.lead as Lead);
  const activities = $derived(lead.activities ?? []);
  const isAdmin = $derived(data.user?.role === "admin");
  const isClosed = $derived(lead.status === "closed_converted" || lead.status === "closed_rejected");

  let showDeleteConfirm = $state(false);
  let showRejectDialog = $state(false);
  let rejectReason = $state("");

  function formatDatetime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function convertUrl(): string {
    const params = new URLSearchParams();
    params.set("fromGeneralLead", lead.id);
    if (lead.notes) params.set("notes", lead.notes);
    return `/humans/new?${params.toString()}`;
  }

  async function handleStatusChange(newStatus: string) {
    if (newStatus === "closed_rejected") {
      showRejectDialog = true;
      return;
    }
    if (newStatus === "closed_converted") {
      // Redirect to convert flow
      window.location.href = convertUrl();
      return;
    }
    try {
      await api(`/api/general-leads/${lead.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await invalidateAll();
    } catch {
      // Status update failed
    }
  }

  async function submitReject() {
    if (!rejectReason.trim()) return;
    try {
      await api(`/api/general-leads/${lead.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "closed_rejected", rejectReason }),
      });
      showRejectDialog = false;
      rejectReason = "";
      await invalidateAll();
    } catch {
      // Rejection failed
    }
  }
</script>

<svelte:head>
  <title>{lead.displayId} - General Lead - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <!-- Record Management Bar -->
  <RecordManagementBar
    backHref="/leads/general-leads"
    backLabel="General Leads"
    title={lead.displayId}
    status={lead.status}
    statusOptions={["open", "qualified", "closed_converted", "closed_rejected"]}
    statusColorMap={generalLeadStatusColors}
    onStatusChange={handleStatusChange}
  >
    {#snippet actions()}
      {#if !isClosed}
        {#if lead.status === "open"}
          <Button size="sm" onclick={() => handleStatusChange("qualified")}>Mark Qualified</Button>
        {/if}
        <a href={convertUrl()} class="btn-primary text-sm py-1.5">Convert to Human</a>
        <Button size="sm" variant="destructive" onclick={() => { showRejectDialog = true; }}>Close Rejected</Button>
      {/if}
    {/snippet}
  </RecordManagementBar>

  <!-- Alerts -->
  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}
  {#if form?.success}
    <AlertBanner type="success" message="Saved successfully." />
  {/if}

  <!-- Helper text -->
  <div class="mt-4 rounded-xl bg-glass/50 border border-glass-border px-4 py-3 text-sm text-text-muted">
    A General Lead is an unverified contact record. Convert to create a verified Human.
  </div>

  <!-- Details -->
  <div class="glass-card p-6 mt-4 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Details</h2>
    <dl class="mt-4 grid grid-cols-2 gap-4">
      <div>
        <dt class="text-sm font-medium text-text-muted">Source</dt>
        <dd class="mt-1">
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {generalLeadSourceColors[lead.source] ?? 'bg-glass text-text-secondary'}">
            {generalLeadSourceLabels[lead.source] ?? lead.source}
          </span>
        </dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Owner</dt>
        <dd class="mt-1 text-sm text-text-primary">{lead.ownerName ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Created</dt>
        <dd class="mt-1 text-sm text-text-primary">{formatDatetime(lead.createdAt)}</dd>
      </div>
      {#if lead.convertedHumanId}
        <div>
          <dt class="text-sm font-medium text-text-muted">Converted Human</dt>
          <dd class="mt-1 text-sm">
            <a href="/humans/{lead.convertedHumanId}" class="text-accent hover:text-[var(--link-hover)] font-mono">
              {lead.convertedHumanDisplayId}
            </a>
            {#if lead.convertedHumanName}
              <span class="text-text-secondary ml-1">({lead.convertedHumanName})</span>
            {/if}
          </dd>
        </div>
      {/if}
      {#if lead.rejectReason}
        <div class="col-span-2">
          <dt class="text-sm font-medium text-text-muted">Reject Reason</dt>
          <dd class="mt-1 text-sm text-destructive-foreground">{lead.rejectReason}</dd>
        </div>
      {/if}
    </dl>
  </div>

  <!-- Notes (editable) -->
  <div class="glass-card p-6 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Notes</h2>
    <form method="POST" action="?/updateNotes" class="mt-3">
      <textarea
        name="notes" rows="4"
        class="glass-input block w-full px-3 py-2 text-sm"
        placeholder="Add notes about this lead..."
      >{lead.notes ?? ""}</textarea>
      <div class="mt-2 flex justify-end">
        <Button type="submit" size="sm">Save Notes</Button>
      </div>
    </form>
  </div>

  <!-- Activities -->
  <div class="mb-6">
    <RelatedListTable
      title="Activities"
      items={activities}
      columns={[
        { key: "type", label: "Type", sortable: true, sortValue: (a) => activityTypeLabels[a.type] ?? a.type },
        { key: "subject", label: "Subject", sortable: true, sortValue: (a) => a.subject },
        { key: "notes", label: "Notes", sortable: true, sortValue: (a) => a.notes ?? "" },
        { key: "date", label: "Date", sortable: true, sortValue: (a) => a.activityDate },
      ]}
      defaultSortKey="date"
      defaultSortDirection="desc"
      searchFilter={(a, q) => {
        const typeLabel = (activityTypeLabels[a.type] ?? a.type).toLowerCase();
        return a.subject.toLowerCase().includes(q) ||
          (a.notes ?? "").toLowerCase().includes(q) ||
          typeLabel.includes(q);
      }}
      emptyMessage="No activities yet."
      searchEmptyMessage="No activities match your search."
      addLabel="Activity"
    >
      {#snippet row(activity, searchQuery)}
        <td>
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
            <HighlightText text={activityTypeLabels[activity.type] ?? activity.type} query={searchQuery} />
          </span>
        </td>
        <td class="text-sm font-medium max-w-sm truncate">
          <HighlightText text={activity.subject} query={searchQuery} />
        </td>
        <td class="text-text-muted max-w-xs truncate"><HighlightText text={activity.notes ?? activity.body ?? "—"} query={searchQuery} /></td>
        <td class="text-text-muted whitespace-nowrap">{new Date(activity.activityDate).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addActivity" class="space-y-3">
          <div>
            <label for="type" class="block text-sm font-medium text-text-secondary">Type</label>
            <SearchableSelect
              options={ACTIVITY_TYPE_OPTIONS}
              name="type"
              id="type"
              value="email"
              placeholder="Select type..."
            />
          </div>
          <div>
            <label for="subject" class="block text-sm font-medium text-text-secondary">Subject</label>
            <input
              id="subject" name="subject" type="text" required
              class="glass-input mt-1 block w-full px-3 py-2 text-sm"
              placeholder="Activity subject"
            />
          </div>
          <div>
            <label for="activityNotes" class="block text-sm font-medium text-text-secondary">Notes</label>
            <textarea
              id="activityNotes" name="notes" rows="3"
              class="glass-input mt-1 block w-full px-3 py-2 text-sm"
              placeholder="Optional notes..."
            ></textarea>
          </div>
          <div>
            <label for="activityDate" class="block text-sm font-medium text-text-secondary">Date</label>
            <input
              id="activityDate" name="activityDate" type="datetime-local"
              class="glass-input mt-1 block w-full px-3 py-2 text-sm"
            />
          </div>
          <Button type="submit" size="sm">
            Add Activity
          </Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Danger Zone (Admin only) -->
  {#if isAdmin}
    <div class="glass-card p-6 border-red-500/20 bg-red-500/5">
      <h2 class="text-lg font-semibold text-destructive-foreground">Danger Zone</h2>
      {#if showDeleteConfirm}
        <p class="mt-2 text-sm text-destructive-foreground/80">Are you sure you want to delete this lead? This cannot be undone.</p>
        <div class="mt-3 flex gap-2">
          <form method="POST" action="?/delete">
            <button type="submit" class="btn-danger text-sm">Yes, Delete</button>
          </form>
          <Button type="button" variant="ghost" size="sm" onclick={() => { showDeleteConfirm = false; }}>Cancel</Button>
        </div>
      {:else}
        <button type="button" onclick={() => { showDeleteConfirm = true; }} class="btn-danger mt-2 text-sm">Delete Lead</button>
      {/if}
    </div>
  {/if}
</div>

<!-- Reject Reason Dialog -->
{#if showRejectDialog}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="glass-card p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold text-text-primary">Close as Rejected</h3>
      <p class="mt-2 text-sm text-text-secondary">Please provide a reason for rejecting this lead.</p>
      <textarea
        bind:value={rejectReason}
        rows="3"
        class="glass-input mt-3 block w-full px-3 py-2 text-sm"
        placeholder="Reject reason..."
      ></textarea>
      <div class="mt-4 flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onclick={() => { showRejectDialog = false; rejectReason = ""; }}>Cancel</Button>
        <Button variant="destructive" size="sm" onclick={submitReject} disabled={!rejectReason.trim()}>Reject Lead</Button>
      </div>
    </div>
  </div>
{/if}
