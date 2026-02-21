<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import PhoneInput from "$lib/components/PhoneInput.svelte";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type LabelConfig = { id: string; name: string };

  const allHumans = $derived(data.allHumans as HumanListItem[]);
  const phoneLabelConfigs = $derived(data.phoneLabelConfigs as LabelConfig[]);

  const humanOptions = $derived(
    allHumans.map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName} (${h.displayId})` }))
  );

  const labelOptions = $derived(
    phoneLabelConfigs.map((l) => ({ value: l.id, label: l.name }))
  );
</script>

<svelte:head>
  <title>New Phone Number - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="New Phone Number"
    breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Phone Numbers", href: "/phone-numbers" }, { label: "New" }]}
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
      <label for="phoneNumber" class="block text-sm font-medium text-text-secondary mb-1">Phone Number <span class="text-red-400">*</span></label>
      <PhoneInput name="phoneNumber" id="phoneNumber" />
    </div>

    <div>
      <label for="phoneLabel" class="block text-sm font-medium text-text-secondary mb-1">Label</label>
      <SearchableSelect
        options={labelOptions}
        name="labelId"
        id="phoneLabel"
        emptyOption="None"
        placeholder="Select label..."
      />
    </div>

    <div class="flex gap-4">
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" name="hasWhatsapp" class="rounded border-glass-border" />
        WhatsApp
      </label>
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" name="isPrimary" class="rounded border-glass-border" />
        Primary
      </label>
    </div>

    <div class="flex gap-3">
      <Button type="submit">Create Phone Number</Button>
      <a href="/phone-numbers" class="btn-ghost">Cancel</a>
    </div>
  </form>
</div>
