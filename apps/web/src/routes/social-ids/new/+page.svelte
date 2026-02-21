<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type PlatformConfig = { id: string; name: string };

  const allHumans = $derived(data.allHumans as HumanListItem[]);
  const platformConfigs = $derived(data.platformConfigs as PlatformConfig[]);

  const humanOptions = $derived(
    allHumans.map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName} (${h.displayId})` }))
  );

  const platformOptions = $derived(
    platformConfigs.map((p) => ({ value: p.id, label: p.name }))
  );
</script>

<svelte:head>
  <title>New Social ID - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="New Social ID"
    breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Social Media IDs", href: "/social-ids" }, { label: "New" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <form method="POST" action="?/create" class="space-y-6 glass-card p-6">
    <div>
      <label for="handle" class="block text-sm font-medium text-text-secondary mb-1">Handle <span class="text-red-400">*</span></label>
      <input
        id="handle" name="handle" type="text" required
        class="glass-input block w-full px-3 py-2 text-sm"
        placeholder="@username"
      />
    </div>

    <div>
      <label for="platform" class="block text-sm font-medium text-text-secondary mb-1">Platform</label>
      <SearchableSelect
        options={platformOptions}
        name="platformId"
        id="platform"
        emptyOption="None"
        placeholder="Select platform..."
      />
    </div>

    <div>
      <label for="owner" class="block text-sm font-medium text-text-secondary mb-1">Owner (Human)</label>
      <SearchableSelect
        options={humanOptions}
        name="humanId"
        id="owner"
        emptyOption="None"
        placeholder="Search owners..."
      />
    </div>

    <div class="flex gap-3">
      <Button type="submit">Create Social ID</Button>
      <a href="/social-ids" class="btn-ghost">Cancel</a>
    </div>
  </form>
</div>
