<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import HighlightText from "$lib/components/HighlightText.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { invalidateAll } from "$app/navigation";
  import { api } from "$lib/api";
  import { toast } from "svelte-sonner";
  import { generalLeadStatusColors, activityTypeColors } from "$lib/constants/colors";
  import { generalLeadStatusLabels, activityTypeLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import NextActionSection from "$lib/components/NextActionSection.svelte";
  import { Button } from "$lib/components/ui/button";
  import { formatDateTime } from "$lib/utils/format";
  import { generalLeadStatuses } from "@humans/shared";
  import { getLeadScoreBand } from "@humans/shared";
  import LeadScoreBadge from "$lib/components/LeadScoreBadge.svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/stores";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type NextAction = {
    id: string;
    ownerId: string | null;
    description: string | null;
    type: string | null;
    dueDate: string | null;
    cadenceNote: string | null;
  };
  type Colleague = { id: string; name: string; displayId?: string };

  type Email = { id: string; displayId: string; email: string; labelId: string | null; isPrimary: boolean; createdAt: string };
  type Phone = { id: string; displayId: string; phoneNumber: string; labelId: string | null; hasWhatsapp: boolean; isPrimary: boolean; createdAt: string };

  type Lead = {
    id: string;
    displayId: string;
    status: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    notes: string | null;
    rejectReason: string | null;
    ownerName: string | null;
    ownerId: string | null;
    convertedHumanId: string | null;
    convertedHumanDisplayId: string | null;
    convertedHumanName: string | null;
    activities: Activity[];
    emails: Email[];
    phoneNumbers: Phone[];
    nextAction?: NextAction | null;
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
  const colleaguesList = $derived((data.colleagues ?? []) as Colleague[]);
  const colleagueOptions = $derived(colleaguesList.map((c) => ({ value: c.id, label: `${c.displayId ?? ""} ${c.name}`.trim() })));
  const isAdmin = $derived(data.user?.role === "admin");
  const isClosed = $derived(lead.status?.startsWith("closed_") ?? false);
  const currentColleagueId = $derived(data.user?.id ?? "");

  type LeadScoreSummary = {
    id: string;
    scoreTotal: number;
    scoreFit: number;
    scoreIntent: number;
    scoreEngagement: number;
    scoreNegative: number;
  };

  let leadScore = $state<LeadScoreSummary | null>(null);
  $effect(() => { leadScore = data.leadScore as LeadScoreSummary | null; });

  const leadScoreBand = $derived(leadScore != null ? getLeadScoreBand(leadScore.scoreTotal) : null);

  // Auto-create lead score on first view if none exists
  $effect(() => {
    if (leadScore == null) {
      api("/api/lead-scores/ensure", {
        method: "POST",
        body: JSON.stringify({ parentType: "general_lead", parentId: lead.id }),
      }).then((result) => {
        if (result != null && typeof result === "object" && "data" in result) {
          leadScore = (result as { data: LeadScoreSummary }).data;
        }
      }).catch(() => {
        // Silent failure — score will be created on next page load
      });
    }
  });

  let showDeleteConfirm = $state(false);
  let showRejectDialog = $state(false);
  let rejectReason = $state("");
  let searchQuery = $state("");
  let searchResults = $state<{ id: string; firstName: string; lastName: string; emails: { email: string }[] }[]>([]);
  let searching = $state(false);
  let converting = $state(false);

  function formatDatetime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function convertUrl(): string {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const params = new URLSearchParams();
    params.set("fromGeneralLead", lead.id);
    params.set("firstName", lead.firstName);
    if (lead.middleName) params.set("middleName", lead.middleName);
    params.set("lastName", lead.lastName);
    if (lead.notes) params.set("notes", lead.notes);
    return `/humans/new?${params.toString()}`;
  }

  async function handleStatusChange(newStatus: string) {
    if (newStatus === "closed_rejected") {
      showRejectDialog = true;
      return;
    }
    if (newStatus === "closed_converted") {
      // Scroll to the Convert to Human card
      document.getElementById("convert-to-human")?.scrollIntoView({ behavior: "smooth" });
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

  async function searchHumans() {
    if (searchQuery.trim().length === 0) {
      searchResults = [];
      return;
    }
    searching = true;
    try {
      const res = await fetch(`/api/search-humans?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const json = await res.json();
        searchResults = json.humans ?? [];
      }
    } finally {
      searching = false;
    }
  }

  async function linkExistingHuman(humanId: string) {
    converting = true;
    try {
      await api(`/api/general-leads/${lead.id}/convert`, {
        method: "POST",
        body: JSON.stringify({ humanId }),
      });
      searchQuery = "";
      searchResults = [];
      toast("Lead converted successfully");
      await invalidateAll();
    } catch (err) {
      toast(`Conversion failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      converting = false;
    }
  }
</script>

<svelte:head>
  <title>{lead.displayId} {lead.firstName} {lead.lastName} - General Lead</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <!-- Record Management Bar -->
  <RecordManagementBar
    backHref="/leads/general-leads"
    backLabel="General Leads"
    title={`${lead.displayId} — ${[lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ")}`}
    status={lead.status}
    statusOptions={[...generalLeadStatuses]}
    statusColorMap={generalLeadStatusColors}
    statusLabels={generalLeadStatusLabels}
    onStatusChange={handleStatusChange}
  >
    {#snippet actions()}
      {#if !isClosed}
        {#if lead.status === "open"}
          <Button size="sm" onclick={() => handleStatusChange("qualified")}>Mark Qualified</Button>
        {/if}
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

  <!-- Next Action -->
  {#if !isClosed}
    <div class="mb-6">
      <NextActionSection
        apiEndpoint={`/api/general-leads/${lead.id}/next-action`}
        {colleagueOptions}
        {currentColleagueId}
        nextAction={lead.nextAction ?? null}
        warnWhenEmpty={lead.status !== "open"}
      />
    </div>
  {/if}

  <!-- Helper text -->
  <div class="mt-4 rounded-xl bg-glass/50 border border-glass-border px-4 py-3 text-sm text-text-muted">
    A General Lead is an unverified contact record. Convert to create a verified Human.
  </div>

  <!-- Metadata -->
  <div class="glass-card p-6 mt-4 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Metadata</h2>
    <dl class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <dt class="text-sm font-medium text-text-muted">Name</dt>
        <dd class="mt-1 text-sm text-text-primary">{[lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ")}</dd>
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
            <a href={resolve(`/humans/${lead.convertedHumanId}?from=${$page.url.pathname}`)} class="text-accent hover:text-[var(--link-hover)] font-mono">
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

  <!-- Lead Score -->
  {#if leadScore != null && leadScoreBand != null}
    <div class="glass-card p-6 mb-6">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-text-primary">Lead Score</h2>
        <a href={resolve(`/reports/lead-scores/${leadScore.id}`)} class="text-sm text-accent hover:underline">
          View Details &rarr;
        </a>
      </div>
      <div class="mt-4 flex items-center gap-6 flex-wrap">
        <LeadScoreBadge score={leadScore.scoreTotal} band={leadScoreBand} size="lg" />
        <div class="flex gap-4 text-sm">
          <div class="text-center">
            <div class="text-lg font-semibold text-green-400">+{leadScore.scoreFit}</div>
            <div class="text-text-muted">Fit</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-blue-400">+{leadScore.scoreIntent}</div>
            <div class="text-text-muted">Intent</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-purple-400">+{leadScore.scoreEngagement}</div>
            <div class="text-text-muted">Engage</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-red-400">-{leadScore.scoreNegative}</div>
            <div class="text-text-muted">Negative</div>
          </div>
        </div>
      </div>
    </div>
  {/if}

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

  <!-- Emails -->
  <div class="mb-6">
    <RelatedListTable
      title="Emails"
      items={lead.emails ?? []}
      columns={[
        { key: "email", label: "Email", sortable: true, sortValue: (e) => e.email },
        { key: "isPrimary", label: "Primary", sortable: false },
      ]}
      defaultSortKey="email"
      searchFilter={(e, q) => e.email.toLowerCase().includes(q)}
      emptyMessage="No emails yet."
      addLabel="Email"
    >
      {#snippet row(email, searchQuery)}
        <td class="text-sm"><HighlightText text={email.email} query={searchQuery} /></td>
        <td>{email.isPrimary ? "Yes" : ""}</td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addEmail" class="space-y-3">
          <div>
            <label for="newEmail" class="block text-sm font-medium text-text-secondary">Email</label>
            <input id="newEmail" name="email" type="email" required class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Email address" />
          </div>
          <Button type="submit" size="sm">Add Email</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Phone Numbers -->
  <div class="mb-6">
    <RelatedListTable
      title="Phone Numbers"
      items={lead.phoneNumbers ?? []}
      columns={[
        { key: "phoneNumber", label: "Phone Number", sortable: true, sortValue: (p) => p.phoneNumber },
        { key: "hasWhatsapp", label: "WhatsApp", sortable: false },
        { key: "isPrimary", label: "Primary", sortable: false },
      ]}
      defaultSortKey="phoneNumber"
      searchFilter={(p, q) => p.phoneNumber.toLowerCase().includes(q)}
      emptyMessage="No phone numbers yet."
      addLabel="Phone Number"
    >
      {#snippet row(phone, searchQuery)}
        <td class="text-sm"><HighlightText text={phone.phoneNumber} query={searchQuery} /></td>
        <td>{phone.hasWhatsapp ? "Yes" : ""}</td>
        <td>{phone.isPrimary ? "Yes" : ""}</td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addPhoneNumber" class="space-y-3">
          <div>
            <label for="newPhone" class="block text-sm font-medium text-text-secondary">Phone Number</label>
            <input id="newPhone" name="phoneNumber" type="tel" required class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Phone number" />
          </div>
          <Button type="submit" size="sm">Add Phone</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Convert to Human -->
  {#if !isClosed}
    <div id="convert-to-human" class="glass-card p-6 mb-6">
      <h2 class="text-lg font-semibold text-text-primary">Convert to Human</h2>
      <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left: Link to existing -->
        <div>
          <p class="text-sm font-medium text-text-secondary mb-2">Link to existing human</p>
          <div class="flex items-center gap-2">
            <input
              type="text"
              bind:value={searchQuery}
              oninput={() => { if (searchQuery.length >= 2) searchHumans(); else searchResults = []; }}
              placeholder="Search by name..."
              class="glass-input flex-1 px-3 py-2 text-sm"
            />
          </div>
          {#if searchResults.length > 0}
            <ul class="mt-2 divide-y divide-glass-border rounded-xl border border-glass-border overflow-hidden">
              {#each searchResults as human, i (i)}
                <li class="flex items-center justify-between px-4 py-3 bg-glass hover:bg-glass-hover transition-colors">
                  <div>
                    <p class="text-sm font-medium text-text-primary">{human.firstName} {human.lastName}</p>
                    {#if human.emails?.[0]}
                      <p class="text-xs text-text-muted">{human.emails[0].email}</p>
                    {/if}
                  </div>
                  <Button type="button" size="sm" disabled={converting} onclick={() => linkExistingHuman(human.id)}>
                    {converting ? "Linking..." : "Link"}
                  </Button>
                </li>
              {/each}
            </ul>
          {/if}
          {#if searching}
            <p class="mt-2 text-sm text-text-muted">Searching...</p>
          {/if}
        </div>
        <!-- Right: Create new -->
        <div>
          <p class="text-sm font-medium text-text-secondary mb-2">Create new human</p>
          <a
            href={resolve(convertUrl())}
            class="btn-primary inline-block text-sm"
          >
            Create New Human
          </a>
        </div>
      </div>
    </div>
  {/if}

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
        <td class="text-text-muted whitespace-nowrap">{formatDateTime(activity.activityDate)}</td>
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
