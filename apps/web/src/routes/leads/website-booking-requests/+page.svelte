<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import LeadScoreBadge from "$lib/components/LeadScoreBadge.svelte";
  import { getLeadScoreBand } from "@humans/shared";
  import { bookingRequestStatusLabels, depositStatusLabels } from "$lib/constants/labels";
  import { resolve } from "$app/paths";

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
    inserted_at: string;
    scoreTotal: number | null;
  };

  const bookings = $derived(data.bookings as Booking[]);

  function displayName(b: Booking): string {
    const parts = [b.first_name, b.middle_name, b.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  }

  function formatDatetime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
    { key: "date", label: "Date" },
  ]}
  {searchFilter}
  searchPlaceholder="Search bookings..."
  clientPageSize={25}
  deleteAction="?/delete"
  deleteMessage="Are you sure you want to delete this booking request? This cannot be undone."
  canDelete={data.userRole === "admin"}
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
      <StatusBadge status={bookingRequestStatusLabels[booking.status ?? ""] ?? booking.status ?? "—"} colorMap={{
        "Confirmed": "badge-green",
        "Cancelled": "badge-red",
        "No Response": "badge-yellow",
        "Converted": "badge-green",
      }} />
    </td>
    <td class="text-text-muted">{formatDatetime(booking.inserted_at)}</td>
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
          <StatusBadge status={bookingRequestStatusLabels[booking.status ?? ""] ?? booking.status ?? "—"} colorMap={{
            "Confirmed": "badge-green",
            "Cancelled": "badge-red",
            "No Response": "badge-yellow",
            "Converted": "badge-green",
          }} />
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
      <div class="mt-2 text-xs text-text-muted">{formatDatetime(booking.inserted_at)}</div>
    </a>
  {/snippet}
</EntityListPage>
