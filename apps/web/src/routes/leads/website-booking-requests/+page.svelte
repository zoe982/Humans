<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import LeadScoreBadge from "$lib/components/LeadScoreBadge.svelte";
  import { getLeadScoreBand, websiteBookingRequestStatuses } from "@humans/shared";
  import { bookingRequestStatusLabels, depositStatusLabels } from "$lib/constants/labels";
  import { bookingRequestStatusColors } from "$lib/constants/colors";
  import { resolve } from "$app/paths";
  import { formatDateTime, formatDate } from "$lib/utils/format";
  import InlineNoteEditor from "$lib/components/InlineNoteEditor.svelte";
  import { api } from "$lib/api";
  import { toast } from "svelte-sonner";
  import { SvelteMap } from "svelte/reactivity";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Booking = {
    id: string;
    crm_display_id: string | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    client_email: string | null;
    origin_city: string | null;
    destination_city: string | null;
    travel_date: string | null;
    status: string | null;
    deposit_status: string | null;
    crm_note: string | null;
    inserted_at: string;
    crm_channel: string | null;
    crm_source: string | null;
    scoreTotal: number | null;
    nextAction: { type: string | null; description: string | null; dueDate: string | null } | null;
  };

  const bookings = $derived(data.bookings as Booking[]);

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

  function getEffectiveStatus(booking: Booking): string {
    return statusOverrides.get(String(booking.id)) ?? booking.status ?? "open";
  }

  function getStatusBadgeStyle(booking: Booking): string {
    const effectiveStatus = getEffectiveStatus(booking);
    // eslint-disable-next-line security/detect-object-injection
    const badgeKey = bookingRequestStatusColors[effectiveStatus];
    // eslint-disable-next-line security/detect-object-injection
    const style = badgeKey ? badgeStyleMap[badgeKey] : null;
    if (!style) return "";
    return `background-color: ${style.bg}; color: ${style.color};`;
  }

  function isOverdue(dueDate: string | null): boolean {
    if (dueDate == null) return false;
    return new Date(dueDate) < new Date();
  }

  async function handleInlineStatusChange(booking: Booking, newStatus: string) {
    // closed_lost — redirect to detail page for loss reason
    if (newStatus === "closed_lost") {
      toast.info("Loss reason required \u2014 please update status on the detail page");
      return;
    }

    const prev = getEffectiveStatus(booking);
    statusOverrides.set(String(booking.id), newStatus);

    try {
      await api(`/api/website-booking-requests/${booking.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success("Status updated");
    } catch {
      if (prev === (booking.status ?? "open")) {
        statusOverrides.delete(String(booking.id));
      } else {
        statusOverrides.set(String(booking.id), prev);
      }
      toast.error("Failed to update status");
    }
  }

  function displayName(b: Booking): string {
    const parts = [b.first_name, b.middle_name, b.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  }

  function searchFilter(item: Booking, q: string): boolean {
    const text = [
      item.crm_display_id,
      item.first_name,
      item.middle_name,
      item.last_name,
      item.client_email,
      item.origin_city,
      item.destination_city,
      item.travel_date,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(q);
  }
</script>

<EntityListPage
  title="Website Booking Requests"
  breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Booking Requests" }]}
  items={bookings}
  error={form?.error}
  columns={[
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "route", label: "Route" },
    { key: "travelDate", label: "Travel Date" },
    { key: "score", label: "Score" },
    { key: "deposit", label: "Deposit" },
    { key: "status", label: "Status" },
    { key: "channel", label: "Channel" },
    { key: "source", label: "Source" },
    { key: "notes", label: "Notes" },
    { key: "nextAction", label: "Next Action" },
    { key: "date", label: "Date" },
  ]}
  {searchFilter}
  searchPlaceholder="Search bookings..."
  clientPageSize={25}
  canDelete={false}
>
  {#snippet desktopRow(booking)}
    <td class="font-mono text-sm whitespace-nowrap">
      <a href={resolve(`/leads/website-booking-requests/${booking.id}`)} class="text-accent hover:text-[var(--link-hover)]">{booking.crm_display_id ?? "—"}</a>
    </td>
    <td class="font-medium">
      <a href={resolve(`/leads/website-booking-requests/${booking.id}`)} class="text-accent hover:text-[var(--link-hover)]">{displayName(booking)}</a>
    </td>
    <td class="text-text-secondary">{booking.client_email ?? "—"}</td>
    <td class="text-text-secondary">
      {#if booking.origin_city || booking.destination_city}
        {booking.origin_city ?? "?"} &rarr; {booking.destination_city ?? "?"}
      {:else}
        —
      {/if}
    </td>
    <td class="text-text-secondary">{booking.travel_date ?? "—"}</td>
    <td>
      {#if booking.scoreTotal != null}
        <LeadScoreBadge score={booking.scoreTotal} band={getLeadScoreBand(booking.scoreTotal)} />
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
    <td>
      <StatusBadge status={depositStatusLabels[booking.deposit_status ?? ""] ?? booking.deposit_status ?? "—"} colorMap={{
        "Pending": "badge-yellow",
        "Paid": "badge-green",
        "Refunded": "badge-purple",
      }} />
    </td>
    <td>
      <select
        class="glass-select-badge"
        style={getStatusBadgeStyle(booking)}
        value={getEffectiveStatus(booking)}
        onchange={(e) => {
          const target = e.currentTarget;
          void handleInlineStatusChange(booking, target.value);
        }}
      >
        {#each websiteBookingRequestStatuses as status, i (i)}
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <option value={status}>{bookingRequestStatusLabels[status] ?? status}</option>
        {/each}
      </select>
    </td>
    <td class="text-text-secondary text-sm">{booking.crm_channel ?? "\u2014"}</td>
    <td class="text-text-secondary text-sm">{booking.crm_source ?? "\u2014"}</td>
    <td>
      <InlineNoteEditor
        value={booking.crm_note}
        onSave={async (note) => {
          await api(`/api/website-booking-requests/${booking.id}`, {
            method: "PATCH",
            body: JSON.stringify({ crm_note: note }),
            headers: { "Content-Type": "application/json" },
          });
          booking.crm_note = note;
        }}
      />
    </td>
    <td class="text-sm max-w-[200px]">
      {#if booking.nextAction}
        <div class="text-text-primary truncate">
          {#if booking.nextAction.type}{booking.nextAction.type}: {/if}{booking.nextAction.description ?? ""}
        </div>
        {#if booking.nextAction.dueDate}
          <div class="text-xs {isOverdue(booking.nextAction.dueDate) ? 'text-[var(--badge-red-text)]' : 'text-text-muted'}">
            Due {formatDate(booking.nextAction.dueDate)}
          </div>
        {/if}
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
    <td class="text-text-muted">{formatDateTime(booking.inserted_at)}</td>
  {/snippet}
  {#snippet mobileCard(booking)}
    <a href={resolve(`/leads/website-booking-requests/${booking.id}`)} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      {#if booking.crm_display_id}
        <span class="font-mono text-xs text-text-muted">{booking.crm_display_id}</span>
      {/if}
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium text-accent">{displayName(booking)}</span>
        <div class="flex items-center gap-2">
          {#if booking.scoreTotal != null}
            <LeadScoreBadge score={booking.scoreTotal} band={getLeadScoreBand(booking.scoreTotal)} />
          {/if}
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <span class="glass-badge {bookingRequestStatusColors[getEffectiveStatus(booking)] ?? 'bg-glass text-text-secondary'}">
            <!-- eslint-disable-next-line security/detect-object-injection -->
            {bookingRequestStatusLabels[getEffectiveStatus(booking)] ?? getEffectiveStatus(booking)}
          </span>
        </div>
      </div>
      {#if booking.client_email}
        <p class="text-sm text-text-secondary truncate">{booking.client_email}</p>
      {/if}
      <div class="mt-1 flex gap-3 text-sm text-text-muted">
        {#if booking.origin_city}<span>{booking.origin_city}</span>{/if}
        {#if booking.origin_city && booking.destination_city}<span>&rarr;</span>{/if}
        {#if booking.destination_city}<span>{booking.destination_city}</span>{/if}
      </div>
      <div class="mt-1 flex items-center gap-3 text-sm text-text-muted">
        {#if booking.travel_date}<span>{booking.travel_date}</span>{/if}
        {#if booking.deposit_status}
          <StatusBadge status={depositStatusLabels[booking.deposit_status] ?? booking.deposit_status} colorMap={{
            "Pending": "badge-yellow",
            "Paid": "badge-green",
            "Refunded": "badge-purple",
          }} />
        {/if}
      </div>
      {#if booking.crm_channel || booking.crm_source}
        <p class="text-xs text-text-secondary mt-1">
          {#if booking.crm_channel}{booking.crm_channel}{/if}
          {#if booking.crm_channel && booking.crm_source} &middot; {/if}
          {#if booking.crm_source}{booking.crm_source}{/if}
        </p>
      {/if}
      {#if booking.nextAction}
        <p class="text-xs text-text-muted mt-1 truncate">
          Next: {#if booking.nextAction.type}{booking.nextAction.type}: {/if}{booking.nextAction.description ?? ""}
        </p>
      {/if}
      <div class="mt-2 text-xs text-text-muted">{formatDateTime(booking.inserted_at)}</div>
    </a>
  {/snippet}
</EntityListPage>
