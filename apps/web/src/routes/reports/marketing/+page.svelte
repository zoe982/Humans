<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";
  import { resolve } from "$app/paths";
</script>

<svelte:head>
  <title>Marketing Reports - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Marketing"
    breadcrumbs={[
      { label: "Dashboard", href: "/dashboard" },
      { label: "Reports", href: "/reports" },
      { label: "Marketing" },
    ]}
  />

  <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a
      href={resolve("/reports/marketing/leads-attributions")}
      class="glass-card p-6 hover:bg-glass-hover transition-colors"
    >
      <h2 class="text-lg font-semibold text-text-primary">Leads &amp; Attributions</h2>
      <p class="mt-2 text-sm text-text-secondary">
        View all leads joined with marketing attribution data including GCLID and FBCLID.
      </p>
    </a>
    <a
      href={resolve("/marketing-attributions")}
      class="glass-card p-6 hover:bg-glass-hover transition-colors"
    >
      <h2 class="text-lg font-semibold text-text-primary">Marketing Attributions</h2>
      <p class="mt-2 text-sm text-text-secondary">
        View marketing attribution data linked to route signups and booking requests.
      </p>
    </a>
  </div>
</div>
