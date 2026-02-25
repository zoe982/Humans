<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import { Button } from "$lib/components/ui/button";
  import { opportunityStageLabels, TERMINAL_STAGES } from "$lib/constants/labels";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type CadenceConfig = {
    id: string;
    stage: string;
    cadenceHours: number;
    displayText: string;
    createdAt: string;
    updatedAt: string;
  };

  const cadenceConfigs = $derived(
    (data.cadenceConfigs as CadenceConfig[]).filter((c) => !TERMINAL_STAGES.has(c.stage))
  );
</script>

<svelte:head>
  <title>Opportunity Cadence - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Opportunity Cadence"
    breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Opportunity Cadence" }]}
  />
  <p class="mt-1 text-sm text-text-secondary">Configure the recommended follow-up cadence for each opportunity stage.</p>

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}
  {#if form?.success}
    <AlertBanner type="success" message="Cadence updated successfully." />
  {/if}

  <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {#each cadenceConfigs as config, i (i)}
      <form method="POST" action="?/updateCadence" class="glass-card p-5 space-y-4">
        <input type="hidden" name="id" value={config.id} />
        <h2 class="text-lg font-semibold text-text-primary">
          {opportunityStageLabels[config.stage] ?? config.stage}
        </h2>
        <div>
          <label for="hours-{config.id}" class="block text-sm font-medium text-text-secondary">Cadence (hours)</label>
          <input
            id="hours-{config.id}"
            name="cadenceHours"
            type="number"
            min="1"
            value={config.cadenceHours}
            class="glass-input mt-1 block w-full"
          />
        </div>
        <div>
          <label for="text-{config.id}" class="block text-sm font-medium text-text-secondary">Display Text</label>
          <input
            id="text-{config.id}"
            name="displayText"
            type="text"
            value={config.displayText}
            class="glass-input mt-1 block w-full"
          />
        </div>
        <Button type="submit" size="sm">Save</Button>
      </form>
    {/each}
  </div>

  {#if cadenceConfigs.length === 0}
    <div class="mt-8 glass-card p-8 text-center">
      <p class="text-text-muted">No cadence configurations found. Run the database migration to seed default values.</p>
    </div>
  {/if}
</div>
