<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";
</script>

<svelte:head>
  <title>Reports - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Reports" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }]} />

  <div class="glass-card">
    <p class="p-8 text-center text-text-muted">Reports will be loaded here.</p>
  </div>
</div>
