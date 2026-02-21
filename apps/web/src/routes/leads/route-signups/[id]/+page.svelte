<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import HighlightText from "$lib/components/HighlightText.svelte";
  import { invalidateAll } from "$app/navigation";
  import { api } from "$lib/api";
  import { signupStatusColors as statusColorMap, activityTypeColors } from "$lib/constants/colors";
  import { activityTypeLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Signup = {
    id: string;
    display_id: string | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    email: string | null;
    origin: string | null;
    destination: string | null;
    status: string | null;
    note: string | null;
    inserted_at: string;
    consent: boolean | null;
    newsletter_opt_in: boolean | null;
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

  const signup = $derived(data.signup as Signup);
  const activities = $derived(data.activities as Activity[]);
  const isAdmin = $derived(data.user?.role === "admin");

  let showDeleteConfirm = $state(false);
  let searchQuery = $state("");
  let searchResults = $state<{ id: string; firstName: string; lastName: string; emails: { email: string }[] }[]>([]);
  let searching = $state(false);

  function displayName(s: Signup): string {
    const parts = [s.first_name, s.middle_name, s.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  }

  function formatDatetime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function convertUrl(): string {
    const params = new URLSearchParams();
    params.set("fromSignup", signup.id);
    if (signup.first_name) params.set("firstName", signup.first_name);
    if (signup.middle_name) params.set("middleName", signup.middle_name);
    if (signup.last_name) params.set("lastName", signup.last_name);
    if (signup.email) params.set("email", signup.email);
    return `/humans/new?${params.toString()}`;
  }

  async function handleStatusChange(newStatus: string) {
    try {
      await api(`/api/route-signups/${signup.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await invalidateAll();
    } catch {
      // Status update failed - page will reload with current status
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
</script>

<svelte:head>
  <title>{signup.display_id ? signup.display_id + ' — ' : ''}{displayName(signup)} - Route Signup - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <!-- Record Management Bar -->
  <RecordManagementBar
    backHref="/leads/route-signups"
    backLabel="Route Signups"
    title="{signup.display_id ? signup.display_id + ' — ' : ''}{displayName(signup)}"
    status={signup.status ?? undefined}
    statusOptions={["open", "qualified", "closed_converted", "closed_rejected"]}
    {statusColorMap}
    onStatusChange={handleStatusChange}
  >
    {#snippet actions()}
      {#if signup.status !== "closed_converted"}
        <a href={convertUrl()} class="btn-primary text-sm py-1.5">
          Convert to Human
        </a>
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

  <!-- Details -->
  <div class="glass-card p-6 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Details</h2>
    <dl class="mt-4 grid grid-cols-2 gap-4">
      <div>
        <dt class="text-sm font-medium text-text-muted">Email</dt>
        <dd class="mt-1 text-sm text-text-primary">{signup.email ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Origin</dt>
        <dd class="mt-1 text-sm text-text-primary">{signup.origin ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Destination</dt>
        <dd class="mt-1 text-sm text-text-primary">{signup.destination ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Created</dt>
        <dd class="mt-1 text-sm text-text-primary">{formatDatetime(signup.inserted_at)}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Consent</dt>
        <dd class="mt-1 text-sm text-text-primary">{signup.consent ? "Yes" : "No"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Newsletter Opt-in</dt>
        <dd class="mt-1 text-sm text-text-primary">{signup.newsletter_opt_in ? "Yes" : "No"}</dd>
      </div>
    </dl>
  </div>

  <!-- Note (Read-only) -->
  <div class="glass-card p-6 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Note</h2>
    <div class="mt-3 rounded-xl bg-glass border border-glass-border px-4 py-3 text-sm text-text-secondary min-h-[3rem]">
      {#if signup.note}
        {signup.note}
      {:else}
        <span class="text-text-muted italic">No note.</span>
      {/if}
    </div>
  </div>

  <!-- Convert to Human -->
  {#if signup.status !== "closed_converted"}
    <div class="glass-card p-6 mb-6">
      <h2 class="text-lg font-semibold text-text-primary">Convert to Human</h2>
      <div class="mt-4 space-y-4">
        <!-- Link to existing human -->
        <div>
          <p class="text-sm font-medium text-text-secondary">Link to existing human</p>
          <div class="mt-2 flex items-center gap-2">
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
              {#each searchResults as human}
                <li class="flex items-center justify-between px-4 py-3 bg-glass hover:bg-glass-hover transition-colors">
                  <div>
                    <p class="text-sm font-medium text-text-primary">{human.firstName} {human.lastName}</p>
                    {#if human.emails?.[0]}
                      <p class="text-xs text-text-muted">{human.emails[0].email}</p>
                    {/if}
                  </div>
                  <form method="POST" action="?/convertToHuman">
                    <input type="hidden" name="humanId" value={human.id} />
                    <button type="submit" class="btn-primary text-xs py-1 px-3">
                      Link
                    </button>
                  </form>
                </li>
              {/each}
            </ul>
          {/if}
          {#if searching}
            <p class="mt-2 text-sm text-text-muted">Searching...</p>
          {/if}
        </div>

        <div class="border-t border-glass-border pt-4">
          <p class="text-sm font-medium text-text-secondary">Or create a new human</p>
          <a
            href={convertUrl()}
            class="btn-primary mt-2 inline-block text-sm"
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
            <label for="notes" class="block text-sm font-medium text-text-secondary">Notes</label>
            <textarea
              id="notes" name="notes" rows="3"
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
          <button type="submit" class="btn-primary text-sm">
            Add Activity
          </button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Danger Zone (Admin only) -->
  {#if isAdmin}
    <div class="glass-card p-6 border-red-500/20 bg-red-500/5">
      <h2 class="text-lg font-semibold text-red-300">Danger Zone</h2>
      {#if showDeleteConfirm}
        <p class="mt-2 text-sm text-red-300/80">Are you sure you want to delete this signup? This cannot be undone.</p>
        <div class="mt-3 flex gap-2">
          <form method="POST" action="?/delete">
            <button type="submit" class="btn-danger text-sm">
              Yes, Delete
            </button>
          </form>
          <button
            type="button"
            onclick={() => { showDeleteConfirm = false; }}
            class="btn-ghost text-sm"
          >
            Cancel
          </button>
        </div>
      {:else}
        <button
          type="button"
          onclick={() => { showDeleteConfirm = true; }}
          class="btn-danger mt-2 text-sm"
        >
          Delete Signup
        </button>
      {/if}
    </div>
  {/if}
</div>
