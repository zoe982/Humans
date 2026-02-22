<script lang="ts">
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";

  let { data }: { data: PageData } = $props();

  type Flight = {
    id: string;
    crm_display_id: string | null;
    origin_city: string | null;
    origin_country: string | null;
    origin_airport_code: string | null;
    destination_city: string | null;
    destination_country: string | null;
    destination_airport_code: string | null;
    flight_date: string | null;
    flight_time: string | null;
    arrival_time: string | null;
    duration_hours: number | null;
    aircraft_type: string | null;
    terminal_fbo: string | null;
    ticket_price_eur: number | null;
    deposit_amount_eur: number | null;
    available_seats: number | null;
    initial_seats: number | null;
    booked_seats: number | null;
    capacity_human_seats: number;
    capacity_pet_seats: number;
    confirmed_bookings_count: number | null;
    visible: boolean | null;
    flight_title: string | null;
    route_description: string | null;
    month: string | null;
    year: number | null;
  };

  type LinkedOpp = {
    id: string;
    displayId: string;
    stage: string;
    passengerSeats: number;
    petSeats: number;
    primaryHuman: { firstName: string; lastName: string; displayId: string } | null;
  };

  const flight = $derived(data.flight as Flight);
  const linkedOpportunities = $derived(data.linkedOpportunities as LinkedOpp[]);

  function formatPrice(val: number | null): string {
    if (val == null) return "\u2014";
    return `\u20AC${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
</script>

<svelte:head>
  <title>{flight.crm_display_id ?? "Flight"} — Flights - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/flights"
    backLabel="Flights"
    title={flight.crm_display_id ?? "Flight"}
  >
    {#snippet actions()}
      <div class="flex items-center gap-2">
        {#if flight.visible}
          <span class="glass-badge badge-green text-xs">Visible</span>
        {:else}
          <span class="glass-badge bg-glass text-text-muted text-xs">Hidden</span>
        {/if}
      </div>
    {/snippet}
  </RecordManagementBar>

  <!-- Flight Details -->
  <div class="glass-card p-6 space-y-6">
    <h2 class="text-lg font-semibold text-text-primary">Flight Details</h2>

    {#if flight.flight_title}
      <p class="text-text-secondary">{flight.flight_title}</p>
    {/if}

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <dt class="text-sm font-medium text-text-muted">Origin</dt>
        <dd class="text-text-primary">
          {flight.origin_city ?? "?"}{flight.origin_country ? `, ${flight.origin_country}` : ""}
          {#if flight.origin_airport_code}
            <span class="text-text-muted ml-1">({flight.origin_airport_code})</span>
          {/if}
        </dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Destination</dt>
        <dd class="text-text-primary">
          {flight.destination_city ?? "?"}{flight.destination_country ? `, ${flight.destination_country}` : ""}
          {#if flight.destination_airport_code}
            <span class="text-text-muted ml-1">({flight.destination_airport_code})</span>
          {/if}
        </dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Date</dt>
        <dd class="text-text-primary">{flight.flight_date ? new Date(flight.flight_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "\u2014"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Departure Time</dt>
        <dd class="text-text-primary">{flight.flight_time ?? "\u2014"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Arrival Time</dt>
        <dd class="text-text-primary">{flight.arrival_time ?? "\u2014"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Duration</dt>
        <dd class="text-text-primary">{flight.duration_hours != null ? `${flight.duration_hours}h` : "\u2014"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Aircraft</dt>
        <dd class="text-text-primary">{flight.aircraft_type ?? "\u2014"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Terminal / FBO</dt>
        <dd class="text-text-primary">{flight.terminal_fbo ?? "\u2014"}</dd>
      </div>
    </div>
  </div>

  <!-- Pricing & Capacity -->
  <div class="mt-6 glass-card p-6 space-y-6">
    <h2 class="text-lg font-semibold text-text-primary">Pricing & Capacity</h2>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt class="text-sm font-medium text-text-muted">Ticket Price</dt>
        <dd class="text-text-primary text-lg font-semibold">{formatPrice(flight.ticket_price_eur)}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Deposit</dt>
        <dd class="text-text-primary">{formatPrice(flight.deposit_amount_eur)}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Human Seats</dt>
        <dd class="text-text-primary">{flight.capacity_human_seats}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Pet Seats</dt>
        <dd class="text-text-primary">{flight.capacity_pet_seats}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Available Seats</dt>
        <dd class="text-text-primary">{flight.available_seats ?? "\u2014"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Booked Seats</dt>
        <dd class="text-text-primary">{flight.booked_seats ?? "\u2014"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Confirmed Bookings</dt>
        <dd class="text-text-primary">{flight.confirmed_bookings_count ?? 0}</dd>
      </div>
    </div>
  </div>

  {#if flight.route_description}
    <div class="mt-6 glass-card p-6">
      <h2 class="text-lg font-semibold text-text-primary mb-2">Route Description</h2>
      <p class="text-text-secondary whitespace-pre-wrap">{flight.route_description}</p>
    </div>
  {/if}

  <!-- Linked Opportunities -->
  <div class="mt-6">
    <RelatedListTable
      title="Linked Opportunities"
      items={linkedOpportunities}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "stage", label: "Stage" },
        { key: "primaryHuman", label: "Primary Human" },
        { key: "passengerSeats", label: "Pax Seats" },
        { key: "petSeats", label: "Pet Seats" },
      ]}
      emptyMessage="No opportunities linked to this flight yet."
    >
      {#snippet row(opp, _searchQuery)}
        <td class="font-mono text-sm">
          <a href="/opportunities/{opp.id}" class="text-accent hover:text-[var(--link-hover)]">{opp.displayId}</a>
        </td>
        <td>
          <span class="glass-badge text-xs bg-glass text-text-secondary">{opp.stage}</span>
        </td>
        <td class="text-sm text-text-secondary">
          {#if opp.primaryHuman}
            <a href="/humans" class="text-accent hover:text-[var(--link-hover)]">{opp.primaryHuman.firstName} {opp.primaryHuman.lastName}</a>
          {:else}
            <span class="text-text-muted">&mdash;</span>
          {/if}
        </td>
        <td class="text-sm text-text-secondary">{opp.passengerSeats}</td>
        <td class="text-sm text-text-secondary">{opp.petSeats}</td>
      {/snippet}
    </RelatedListTable>
  </div>
</div>
