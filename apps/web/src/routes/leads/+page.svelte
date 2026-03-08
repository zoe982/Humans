<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";
  import { resolve } from "$app/paths";
</script>

<svelte:head>
  <title>Leads - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Lead Pipeline" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Leads" }]} />

  <a href={resolve('/leads/all')} class="mt-6 glass-card p-6 block hover:bg-glass-hover transition-colors">
    <h2 class="text-lg font-semibold text-text-primary">All Leads</h2>
    <p class="mt-2 text-sm text-text-secondary">Unified view of all lead types — general leads, route signups, booking requests, and evacuation leads — in a single table.</p>
  </a>

  <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <a href={resolve('/leads/route-signups')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Route Signups</h2>
      <p class="mt-2 text-sm text-text-secondary">View and manage route announcement signups from the website.</p>
    </a>
    <a href={resolve('/leads/website-booking-requests')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Website Booking Requests</h2>
      <p class="mt-2 text-sm text-text-secondary">View and manage booking requests submitted through the website.</p>
    </a>
    <a href={resolve('/leads/general-leads')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">General Leads</h2>
      <p class="mt-2 text-sm text-text-secondary">Capture and work early enquiries before converting to a verified Human.</p>
    </a>
    <a href={resolve('/leads/evacuation-leads')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Evacuation Leads</h2>
      <p class="mt-2 text-sm text-text-secondary">Manage urgent contact requests from people seeking evacuation assistance.</p>
    </a>
  </div>
</div>
