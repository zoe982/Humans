<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Dashboard - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Dashboard" />
  <p class="mt-2 text-text-secondary">Welcome back, {data.user?.name ?? "User"}.</p>

  <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
    <a href="/humans" class="glass-card p-6 transition hover:ring-1 hover:ring-accent/40">
      <h3 class="text-sm font-medium text-text-muted">Humans</h3>
      <p class="mt-2 text-3xl font-bold text-text-primary">{data.counts.humans}</p>
    </a>
    <a href="/humans" class="glass-card p-6 transition hover:ring-1 hover:ring-accent/40">
      <h3 class="text-sm font-medium text-text-muted">Pets</h3>
      <p class="mt-2 text-3xl font-bold text-text-primary">{data.counts.pets}</p>
    </a>
    <a href="/activities" class="glass-card p-6 transition hover:ring-1 hover:ring-accent/40">
      <h3 class="text-sm font-medium text-text-muted">Total Activities</h3>
      <p class="mt-2 text-3xl font-bold text-text-primary">{data.counts.activities}</p>
    </a>
    <a href="/geo-interests" class="glass-card p-6 transition hover:ring-1 hover:ring-accent/40">
      <h3 class="text-sm font-medium text-text-muted">Geo-Interests</h3>
      <p class="mt-2 text-3xl font-bold text-text-primary">{data.counts.geoInterests}</p>
    </a>
  </div>
</div>
