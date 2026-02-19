<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";
</script>

<svelte:head>
  <title>Leads - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Lead Pipeline" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Leads" }]} />

  <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a href="/leads/route-signups" class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Route Signups</h2>
      <p class="mt-2 text-sm text-text-secondary">View and manage route announcement signups from the website.</p>
    </a>
  </div>
</div>
