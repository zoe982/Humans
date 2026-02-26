<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { Button } from "$lib/components/ui/button";
  import { resolve } from "$app/paths";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const colleagueOptions = $derived(
    (data.colleagues as { id: string; name: string; displayId: string }[]).map((c) => ({ value: c.id, label: `${c.displayId} ${c.name}` })),
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
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label for="firstName" class="block text-sm font-medium text-text-secondary mb-1">First Name <span class="text-red-400">*</span></label>
        <input
          id="firstName" name="firstName" type="text" required
          class="glass-input block w-full px-3 py-2 text-sm"
          placeholder="First name..."
        />
      </div>
      <div>
        <label for="middleName" class="block text-sm font-medium text-text-secondary mb-1">Middle Name</label>
        <input
          id="middleName" name="middleName" type="text"
          class="glass-input block w-full px-3 py-2 text-sm"
          placeholder="Middle name..."
        />
      </div>
      <div>
        <label for="lastName" class="block text-sm font-medium text-text-secondary mb-1">Last Name <span class="text-red-400">*</span></label>
        <input
          id="lastName" name="lastName" type="text" required
          class="glass-input block w-full px-3 py-2 text-sm"
          placeholder="Last name..."
        />
      </div>
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
      <a href={resolve('/leads/general-leads')} class="btn-ghost">Cancel</a>
    </div>
  </form>
</div>
