<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import HighlightText from "$lib/components/HighlightText.svelte";
  import { bookingRequestStatusColors, activityTypeColors } from "$lib/constants/colors";
  import { bookingRequestStatusLabels, depositStatusLabels, balanceStatusLabels, activityTypeLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Booking = {
    id: string;
    crm_display_id: string | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    client_email: string | null;
    phone_number: string | null;
    origin_city: string | null;
    destination_city: string | null;
    travel_date: string | null;
    travel_time: string | null;
    number_of_dogs: number | null;
    client_pet_name: string | null;
    seats_booked: number | null;
    base_flight_price_eur: number | null;
    deposit_status: string | null;
    deposit_paid_eur: number | null;
    balance_status: string | null;
    balance_paid_eur: number | null;
    balance_due_date: string | null;
    status: string | null;
    crm_note: string | null;
    inserted_at: string;
    booking_request_ref: string | null;
    additional_information: string | null;
  };

  type Activity = {
    id: string;
    type: string;
    subject: string;
    notes: string | null;
    body: string | null;
    activityDate: string;
    ownerId: string | null;
    ownerName: string | null;
    ownerDisplayId: string | null;
    createdAt: string;
  };

  const booking = $derived(data.booking as Booking);
  const activities = $derived(data.activities as Activity[]);
  const isAdmin = $derived(data.user?.role === "admin");
  const isManager = $derived(data.user?.role === "manager" || data.user?.role === "admin");

  let showDeleteConfirm = $state(false);
  let editingNote = $state(false);
  let noteValue = $state("");
  let searchQuery = $state("");
  let searchResults = $state<{ id: string; firstName: string; lastName: string; emails: { email: string }[] }[]>([]);
  let searching = $state(false);

  function displayName(b: Booking): string {
    const parts = [b.first_name, b.middle_name, b.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  }

  function formatDatetime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatEur(value: number | null): string {
    if (value == null) return "—";
    return `€${Number(value).toFixed(2)}`;
  }

  function convertUrl(): string {
    const params = new URLSearchParams();
    params.set("fromBookingRequest", booking.id);
    if (booking.first_name) params.set("firstName", booking.first_name);
    if (booking.middle_name) params.set("middleName", booking.middle_name);
    if (booking.last_name) params.set("lastName", booking.last_name);
    if (booking.client_email) params.set("email", booking.client_email);
    return `/humans/new?${params.toString()}`;
  }

  function startEditNote() {
    noteValue = booking.crm_note ?? "";
    editingNote = true;
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
  <title>{booking.crm_display_id ? booking.crm_display_id + ' — ' : ''}{displayName(booking)} - Booking Request - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/leads/website-booking-requests"
    backLabel="Booking Requests"
    title="{booking.crm_display_id ? booking.crm_display_id + ' — ' : ''}{displayName(booking)}"
    status={booking.status ?? undefined}
    statusOptions={["confirmed", "closed_cancelled"]}
    statusLabels={bookingRequestStatusLabels}
    statusColorMap={bookingRequestStatusColors}
    statusFormAction="?/updateStatus"
  >
    {#snippet actions()}
      <a href={convertUrl()} class="btn-primary text-sm py-1.5">
        Convert to Human
      </a>
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
        <dd class="mt-1 text-sm text-text-primary">{booking.client_email ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Phone</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.phone_number ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Origin</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.origin_city ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Destination</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.destination_city ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Travel Date</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.travel_date ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Travel Time</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.travel_time ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Number of Dogs</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.number_of_dogs ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Pet Name</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.client_pet_name ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Seats Booked</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.seats_booked ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Booking Ref</dt>
        <dd class="mt-1 text-sm text-text-primary font-mono">{booking.booking_request_ref ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Created</dt>
        <dd class="mt-1 text-sm text-text-primary">{formatDatetime(booking.inserted_at)}</dd>
      </div>
    </dl>
    {#if booking.additional_information}
      <div class="mt-4">
        <dt class="text-sm font-medium text-text-muted">Additional Information</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.additional_information}</dd>
      </div>
    {/if}
  </div>

  <!-- Pricing -->
  <div class="glass-card p-6 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Pricing</h2>
    <dl class="mt-4 grid grid-cols-2 gap-4">
      <div>
        <dt class="text-sm font-medium text-text-muted">Base Flight Price</dt>
        <dd class="mt-1 text-sm text-text-primary">{formatEur(booking.base_flight_price_eur)}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Deposit Status</dt>
        <dd class="mt-1">
          <StatusBadge status={depositStatusLabels[booking.deposit_status ?? ""] ?? booking.deposit_status ?? "—"} colorMap={{
            "Pending": "badge-yellow",
            "Paid": "badge-green",
            "Refunded": "badge-purple",
          }} />
        </dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Deposit Paid</dt>
        <dd class="mt-1 text-sm text-text-primary">{formatEur(booking.deposit_paid_eur)}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Balance Status</dt>
        <dd class="mt-1">
          <StatusBadge status={balanceStatusLabels[booking.balance_status ?? ""] ?? booking.balance_status ?? "—"} colorMap={{
            "Pending": "badge-yellow",
            "Paid": "badge-green",
            "Refunded": "badge-purple",
          }} />
        </dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Balance Paid</dt>
        <dd class="mt-1 text-sm text-text-primary">{formatEur(booking.balance_paid_eur)}</dd>
      </div>
      {#if booking.balance_due_date}
        <div>
          <dt class="text-sm font-medium text-text-muted">Balance Due Date</dt>
          <dd class="mt-1 text-sm text-text-primary">{booking.balance_due_date}</dd>
        </div>
      {/if}
    </dl>
  </div>

  <!-- CRM Note (editable) -->
  <div class="glass-card p-6 mb-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-text-primary">CRM Note</h2>
      {#if isManager && !editingNote}
        <Button type="button" variant="ghost" size="sm" onclick={startEditNote}>Edit</Button>
      {/if}
    </div>
    {#if editingNote}
      <form method="POST" action="?/updateNote" class="mt-3" onsubmit={() => { editingNote = false; }}>
        <textarea
          name="crm_note"
          rows="4"
          class="glass-input block w-full px-4 py-3 text-sm"
          bind:value={noteValue}
        ></textarea>
        <div class="mt-2 flex gap-2">
          <Button type="submit" size="sm">Save</Button>
          <Button type="button" variant="ghost" size="sm" onclick={() => { editingNote = false; }}>Cancel</Button>
        </div>
      </form>
    {:else}
      <div class="mt-3 rounded-xl bg-glass border border-glass-border px-4 py-3 text-sm text-text-secondary min-h-[3rem]">
        {#if booking.crm_note}
          {booking.crm_note}
        {:else}
          <span class="text-text-muted italic">No note.</span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Convert to Human -->
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
                  <Button type="submit" size="sm">
                    Link
                  </Button>
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

  <!-- Activities -->
  <div class="mb-6">
    <RelatedListTable
      title="Activities"
      items={activities}
      columns={[
        { key: "type", label: "Type", sortable: true, sortValue: (a) => activityTypeLabels[a.type] ?? a.type },
        { key: "owner", label: "Owner", sortable: true, sortValue: (a) => a.ownerName ?? "" },
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
        <td class="text-sm text-text-secondary">{activity.ownerName ?? "\u2014"}</td>
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
        <p class="mt-2 text-sm text-destructive-foreground/80">Are you sure you want to delete this booking request? This cannot be undone.</p>
        <div class="mt-3 flex gap-2">
          <form method="POST" action="?/delete">
            <button type="submit" class="btn-danger text-sm">
              Yes, Delete
            </button>
          </form>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onclick={() => { showDeleteConfirm = false; }}
          >
            Cancel
          </Button>
        </div>
      {:else}
        <button
          type="button"
          onclick={() => { showDeleteConfirm = true; }}
          class="btn-danger mt-2 text-sm"
        >
          Delete Booking Request
        </button>
      {/if}
    </div>
  {/if}
</div>
