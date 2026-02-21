<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import Pagination from "$lib/components/Pagination.svelte";
  import { bookingRequestStatusLabels, depositStatusLabels } from "$lib/constants/labels";

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

  let pendingDeleteId = $state<string | null>(null);
  let deleteFormEl = $state<HTMLFormElement>();
</script>

<svelte:head>
  <title>Website Booking Requests - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Website Booking Requests"
    breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Booking Requests" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <!-- Mobile card view -->
  <div class="sm:hidden space-y-3">
    {#each bookings as booking (booking.id)}
      <a href="/leads/website-booking-requests/{booking.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
        {#if booking.crm_display_id}
          <span class="font-mono text-xs text-text-muted">{booking.crm_display_id}</span>
        {/if}
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-accent">{displayName(booking)}</span>
          <StatusBadge status={bookingRequestStatusLabels[booking.status ?? ""] ?? booking.status ?? "—"} colorMap={{
            "Confirmed": "bg-[rgba(34,197,94,0.15)] text-green-300",
            "Cancelled": "bg-[rgba(239,68,68,0.15)] text-red-300",
          }} />
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
              "Pending": "bg-[rgba(234,179,8,0.15)] text-yellow-300",
              "Paid": "bg-[rgba(34,197,94,0.15)] text-green-300",
              "Refunded": "bg-[rgba(168,85,247,0.15)] text-purple-300",
            }} />
          {/if}
        </div>
        <div class="mt-2 flex items-center justify-between">
          <span class="text-xs text-text-muted">{formatDatetime(booking.inserted_at)}</span>
          {#if data.userRole === "admin"}
            <button type="button" class="text-red-400 hover:text-red-300 text-xs" onclick={(e) => { e.preventDefault(); pendingDeleteId = booking.id; }}>Delete</button>
          {/if}
        </div>
      </a>
    {:else}
      <div class="glass-card p-6 text-center text-sm text-text-muted">No booking requests found.</div>
    {/each}
  </div>

  <!-- Desktop table view -->
  <div class="glass-card overflow-hidden hidden sm:block">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th scope="col">ID</th>
          <th scope="col">Name</th>
          <th scope="col">Email</th>
          <th scope="col">Route</th>
          <th scope="col">Travel Date</th>
          <th scope="col">Deposit</th>
          <th scope="col">Status</th>
          <th scope="col">Date</th>
          {#if data.userRole === "admin"}
            <th scope="col">Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each bookings as booking (booking.id)}
          <tr class="glass-row-hover">
            <td class="font-mono text-sm whitespace-nowrap">
              <a href="/leads/website-booking-requests/{booking.id}" class="text-accent hover:text-cyan-300">{booking.crm_display_id ?? "—"}</a>
            </td>
            <td class="font-medium">
              <a href="/leads/website-booking-requests/{booking.id}" class="text-accent hover:text-cyan-300">{displayName(booking)}</a>
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
              <StatusBadge status={depositStatusLabels[booking.deposit_status ?? ""] ?? booking.deposit_status ?? "—"} colorMap={{
                "Pending": "bg-[rgba(234,179,8,0.15)] text-yellow-300",
                "Paid": "bg-[rgba(34,197,94,0.15)] text-green-300",
                "Refunded": "bg-[rgba(168,85,247,0.15)] text-purple-300",
              }} />
            </td>
            <td>
              <StatusBadge status={bookingRequestStatusLabels[booking.status ?? ""] ?? booking.status ?? "—"} colorMap={{
                "Confirmed": "bg-[rgba(34,197,94,0.15)] text-green-300",
                "Cancelled": "bg-[rgba(239,68,68,0.15)] text-red-300",
              }} />
            </td>
            <td class="text-text-muted">{formatDatetime(booking.inserted_at)}</td>
            {#if data.userRole === "admin"}
              <td>
                <button type="button" class="text-red-400 hover:text-red-300 text-sm" onclick={() => { pendingDeleteId = booking.id; }}>Delete</button>
              </td>
            {/if}
          </tr>
        {:else}
          <tr>
            <td colspan={data.userRole === "admin" ? 9 : 8} class="px-6 py-8 text-center text-sm text-text-muted">No booking requests found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <Pagination page={data.page} limit={data.limit} total={data.total} baseUrl="/leads/website-booking-requests" />
</div>

<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden">
  <input type="hidden" name="id" value={pendingDeleteId ?? ""} />
</form>

<ConfirmDialog
  open={pendingDeleteId !== null}
  message="Are you sure you want to delete this booking request? This cannot be undone."
  onConfirm={() => { deleteFormEl?.requestSubmit(); pendingDeleteId = null; }}
  onCancel={() => { pendingDeleteId = null; }}
/>
