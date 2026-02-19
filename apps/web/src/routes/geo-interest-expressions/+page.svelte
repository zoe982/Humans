<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";

  let { data }: { data: PageData } = $props();

  type Expression = {
    id: string;
    humanId: string;
    geoInterestId: string;
    activityId: string | null;
    notes: string | null;
    createdAt: string;
    humanName: string | null;
    city: string | null;
    country: string | null;
    activitySubject: string | null;
  };

  const expressions = $derived(data.expressions as Expression[]);
</script>

<svelte:head>
  <title>Geo-Interest Expressions - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Geo-Interest Expressions" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Geo-Interest Expressions" }]} />

  <div class="glass-card overflow-hidden">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th>Human</th>
          <th>City / Country</th>
          <th>Activity</th>
          <th>Notes</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {#each expressions as expr (expr.id)}
          <tr class="glass-row-hover">
            <td class="font-medium">
              <a href="/humans/{expr.humanId}" class="text-accent hover:text-cyan-300">{expr.humanName ?? "—"}</a>
            </td>
            <td>
              <a href="/geo-interests/{expr.geoInterestId}" class="text-accent hover:text-cyan-300">
                {expr.city ?? "—"}, {expr.country ?? "—"}
              </a>
            </td>
            <td class="text-text-secondary text-sm">
              {#if expr.activitySubject}
                {expr.activitySubject}
              {:else}
                —
              {/if}
            </td>
            <td class="text-text-secondary text-sm">{expr.notes ?? "—"}</td>
            <td class="text-text-muted text-sm">{new Date(expr.createdAt).toLocaleDateString()}</td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="px-6 py-8 text-center text-sm text-text-muted">No expressions found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
