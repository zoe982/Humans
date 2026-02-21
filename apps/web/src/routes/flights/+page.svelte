<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";
</script>

<svelte:head>
  <title>Flights - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Flights" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Flights" }]}>
    {#snippet action()}
      <a href="/flights/new" class="btn-primary">Add Flight</a>
    {/snippet}
  </PageHeader>

  <div class="glass-card">
    <p class="p-8 text-center text-text-muted">Flight list will be loaded here.</p>
  </div>
</div>
