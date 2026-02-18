<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Dashboard - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
  <p class="mt-2 text-gray-600">Welcome back, {data.user?.name ?? "User"}.</p>

  <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
    <div class="rounded-lg bg-white p-6 shadow">
      <h3 class="text-sm font-medium text-gray-500">Total Clients</h3>
      <p class="mt-2 text-3xl font-bold text-gray-900">—</p>
    </div>
    <div class="rounded-lg bg-white p-6 shadow">
      <h3 class="text-sm font-medium text-gray-500">Active Pets</h3>
      <p class="mt-2 text-3xl font-bold text-gray-900">—</p>
    </div>
    <div class="rounded-lg bg-white p-6 shadow">
      <h3 class="text-sm font-medium text-gray-500">Upcoming Flights</h3>
      <p class="mt-2 text-3xl font-bold text-gray-900">—</p>
    </div>
    <div class="rounded-lg bg-white p-6 shadow">
      <h3 class="text-sm font-medium text-gray-500">Open Leads</h3>
      <p class="mt-2 text-3xl font-bold text-gray-900">—</p>
    </div>
  </div>
</div>
