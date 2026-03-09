<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";
  import { resolve } from "$app/paths";
</script>

<svelte:head>
  <title>Pipelines - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Pipelines"
    breadcrumbs={[
      { label: "Dashboard", href: "/dashboard" },
      { label: "Reports", href: "/reports" },
      { label: "Pipelines" },
    ]}
  />

  <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a
      href={resolve("/reports/pipelines/opportunities")}
      class="glass-card p-6 hover:bg-glass-hover transition-colors"
    >
      <h2 class="text-lg font-semibold text-text-primary">Opportunities Pipeline</h2>
      <p class="mt-2 text-sm text-text-secondary">
        View all active opportunities grouped by stage with table and kanban views.
      </p>
    </a>
    <a
      href={resolve("/reports/pipelines/leads")}
      class="glass-card p-6 hover:bg-glass-hover transition-colors"
    >
      <h2 class="text-lg font-semibold text-text-primary">Leads Pipeline</h2>
      <p class="mt-2 text-sm text-text-secondary">
        View all active leads grouped by status with table and kanban views.
      </p>
    </a>
  </div>
</div>
