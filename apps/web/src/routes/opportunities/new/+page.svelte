<script lang="ts">
  import type { ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import { Button } from "$lib/components/ui/button";

  let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
  <title>New Opportunity - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="New Opportunity"
    breadcrumbs={[{ label: "Opportunities", href: "/opportunities" }, { label: "New" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <form method="POST" action="?/create" class="space-y-6 glass-card p-6">
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="seatsRequested" class="block text-sm font-medium text-text-secondary mb-1">Seats Requested</label>
        <input
          id="seatsRequested" name="seatsRequested" type="number" min="1" value="1"
          class="glass-input block w-full px-3 py-2 text-sm"
        />
      </div>
    </div>

    <div class="flex gap-3">
      <Button type="submit">Create Opportunity</Button>
      <a href="/opportunities" class="btn-ghost">Cancel</a>
    </div>
  </form>
</div>
