<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import GlassDatePicker from "$lib/components/GlassDatePicker.svelte";
  import { Button } from "$lib/components/ui/button";
  import { resolve } from "$app/paths";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type AccountListItem = { id: string; name: string; displayId: string };
  type ConfigItem = { id: string; name: string };

  const allHumans = $derived(data.allHumans as HumanListItem[]);
  const allAccounts = $derived(data.allAccounts as AccountListItem[]);
  const agreementTypes = $derived(data.agreementTypes as ConfigItem[]);

  const humanOptions = $derived(
    allHumans.map((h) => ({ value: h.id, label: `${h.displayId} ${h.firstName} ${h.lastName}` }))
  );

  const accountOptions = $derived(
    allAccounts.map((a) => ({ value: a.id, label: `${a.displayId} ${a.name}` }))
  );

  const typeOptions = $derived(
    agreementTypes.map((t) => ({ value: t.id, label: t.name }))
  );

  let activationDate = $state("");
</script>

<svelte:head>
  <title>New Agreement - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="New Agreement"
    breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Agreements", href: "/agreements" }, { label: "New" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <form method="POST" action="?/create" class="space-y-6 glass-card p-6">
    <div>
      <label for="title" class="block text-sm font-medium text-text-secondary mb-1">Title <span class="text-red-400">*</span></label>
      <input
        id="title" name="title" type="text" required
        class="glass-input block w-full px-3 py-2 text-sm"
        placeholder="Agreement title"
      />
    </div>

    <div>
      <label for="typeId" class="block text-sm font-medium text-text-secondary mb-1">Type</label>
      <SearchableSelect
        options={typeOptions}
        name="typeId"
        id="typeId"
        emptyOption="None"
        placeholder="Select type..."
      />
    </div>

    <div>
      <label for="human" class="block text-sm font-medium text-text-secondary mb-1">Human</label>
      <SearchableSelect
        options={humanOptions}
        name="humanId"
        id="human"
        emptyOption="None"
        placeholder="Search humans..."
      />
    </div>

    <div>
      <label for="account" class="block text-sm font-medium text-text-secondary mb-1">Account</label>
      <SearchableSelect
        options={accountOptions}
        name="accountId"
        id="account"
        emptyOption="None"
        placeholder="Search accounts..."
      />
    </div>

    <div>
      <label for="activationDate" class="block text-sm font-medium text-text-secondary mb-1">Activation Date</label>
      <GlassDatePicker value={activationDate} id="activationDate" name="activationDate" onchange={(v) => { activationDate = v; }} />
    </div>

    <div>
      <label for="notes" class="block text-sm font-medium text-text-secondary mb-1">Notes</label>
      <textarea
        id="notes" name="notes" rows={5}
        class="glass-input block w-full px-3 py-2 text-sm"
        placeholder="Optional notes..."
      ></textarea>
    </div>

    <p class="text-xs text-text-muted">At least one of Human or Account is required.</p>

    <div class="flex gap-3">
      <Button type="submit">Create Agreement</Button>
      <a href={resolve('/agreements')} class="btn-ghost">Cancel</a>
    </div>
  </form>
</div>
