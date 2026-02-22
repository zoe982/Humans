<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { GENERAL_LEAD_SOURCE_OPTIONS } from "$lib/constants/labels";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const colleagueOptions = $derived(
    (data.colleagues as { id: string; name: string }[]).map((c) => ({ value: c.id, label: c.name })),
  );
</script>

<svelte:head>
  <title>New General Lead - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="New General Lead"
    breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "General Leads", href: "/leads/general-leads" }, { label: "New" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <form method="POST" action="?/create" class="space-y-6 glass-card p-6">
    <div>
      <label for="source" class="block text-sm font-medium text-text-secondary mb-1">Source <span class="text-red-400">*</span></label>
      <SearchableSelect
        options={GENERAL_LEAD_SOURCE_OPTIONS}
        name="source"
        id="source"
        value=""
        placeholder="Select source..."
      />
    </div>

    <div>
      <label for="notes" class="block text-sm font-medium text-text-secondary mb-1">Notes</label>
      <textarea
        id="notes" name="notes" rows="4"
        class="glass-input block w-full px-3 py-2 text-sm"
        placeholder="Describe the enquiry..."
      ></textarea>
    </div>

    <div>
      <label for="ownerId" class="block text-sm font-medium text-text-secondary mb-1">Owner</label>
      <SearchableSelect
        options={colleagueOptions}
        name="ownerId"
        id="ownerId"
        value=""
        placeholder="Assign an owner..."
      />
    </div>

    <div class="flex gap-3">
      <Button type="submit">Create Lead</Button>
      <a href="/leads/general-leads" class="btn-ghost">Cancel</a>
    </div>
  </form>
</div>
