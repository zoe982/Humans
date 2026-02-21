<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type LabelConfig = { id: string; name: string };

  const allHumans = $derived(data.allHumans as HumanListItem[]);
  const emailLabelConfigs = $derived(data.emailLabelConfigs as LabelConfig[]);

  const humanOptions = $derived(
    allHumans.map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName} (${h.displayId})` }))
  );

  const labelOptions = $derived(
    emailLabelConfigs.map((l) => ({ value: l.id, label: l.name }))
  );
</script>

<svelte:head>
  <title>New Email - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="New Email"
    breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Emails", href: "/emails" }, { label: "New" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <form method="POST" action="?/create" class="space-y-6 glass-card p-6">
    <div>
      <label for="owner" class="block text-sm font-medium text-text-secondary mb-1">Owner <span class="text-red-400">*</span></label>
      <SearchableSelect
        options={humanOptions}
        name="humanId"
        id="owner"
        placeholder="Search owners..."
      />
    </div>

    <div>
      <label for="emailAddress" class="block text-sm font-medium text-text-secondary mb-1">Email <span class="text-red-400">*</span></label>
      <input
        id="emailAddress" name="email" type="email" required
        class="glass-input block w-full px-3 py-2 text-sm"
        placeholder="email@example.com"
      />
    </div>

    <div>
      <label for="emailLabel" class="block text-sm font-medium text-text-secondary mb-1">Label</label>
      <SearchableSelect
        options={labelOptions}
        name="labelId"
        id="emailLabel"
        emptyOption="None"
        placeholder="Select label..."
      />
    </div>

    <div>
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" name="isPrimary" class="rounded border-glass-border" />
        Primary
      </label>
    </div>

    <div class="flex gap-3">
      <Button type="submit">Create Email</Button>
      <a href="/emails" class="btn-ghost">Cancel</a>
    </div>
  </form>
</div>
