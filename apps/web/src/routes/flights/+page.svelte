<script lang="ts">
  import type { PageData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";

  let { data }: { data: PageData } = $props();

  type Flight = {
    id: string;
    crm_display_id: string | null;
    origin_city: string | null;
    destination_city: string | null;
    flight_date: string | null;
    available_seats: number | null;
    ticket_price_eur: number | null;
    visible: boolean | null;
    capacity_human_seats: number;
    capacity_pet_seats: number;
  };

  const flights = $derived(data.flights as Flight[]);
</script>

<EntityListPage
  title="Flights"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Flights" }]}
  items={flights}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "route", label: "Route" },
    { key: "date", label: "Date" },
    { key: "seats", label: "Seats" },
    { key: "price", label: "Price" },
    { key: "visible", label: "Visible" },
  ]}
  pagination={{ page: data.page, limit: data.limit, total: data.total, baseUrl: "/flights" }}
>
  {#snippet desktopRow(flight)}
    <td class="font-mono text-sm">
      <a href="/flights/{flight.id}" class="text-accent hover:text-[var(--link-hover)]">{flight.crm_display_id ?? "\u2014"}</a>
    </td>
    <td class="text-sm text-text-secondary">
      {flight.origin_city ?? "?"} &rarr; {flight.destination_city ?? "?"}
    </td>
    <td class="text-sm text-text-muted whitespace-nowrap">
      {flight.flight_date ? new Date(flight.flight_date + "T00:00:00").toLocaleDateString() : "\u2014"}
    </td>
    <td class="text-sm text-text-secondary">
      {flight.available_seats ?? "\u2014"} / {flight.capacity_human_seats + flight.capacity_pet_seats}
    </td>
    <td class="text-sm text-text-secondary">
      {flight.ticket_price_eur != null ? `\u20AC${Number(flight.ticket_price_eur).toLocaleString()}` : "\u2014"}
    </td>
    <td>
      {#if flight.visible}
        <span class="glass-badge badge-green text-xs">Yes</span>
      {:else}
        <span class="glass-badge bg-glass text-text-muted text-xs">No</span>
      {/if}
    </td>
  {/snippet}
  {#snippet mobileCard(flight)}
    <a href="/flights/{flight.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{flight.crm_display_id ?? "\u2014"}</span>
      <div class="font-medium text-accent mt-1">
        {flight.origin_city ?? "?"} &rarr; {flight.destination_city ?? "?"}
      </div>
      <div class="flex items-center gap-3 text-sm text-text-secondary mt-1">
        <span>{flight.flight_date ? new Date(flight.flight_date + "T00:00:00").toLocaleDateString() : "\u2014"}</span>
        <span>{flight.available_seats ?? 0} seats avail.</span>
        {#if flight.visible}
          <span class="glass-badge badge-green text-xs">Visible</span>
        {/if}
      </div>
    </a>
  {/snippet}
</EntityListPage>
