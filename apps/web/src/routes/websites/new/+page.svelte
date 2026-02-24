<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { Button } from "$lib/components/ui/button";
  import { resolve } from "$app/paths";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type AccountListItem = { id: string; name: string; displayId: string };

  const allHumans = $derived(data.allHumans as HumanListItem[]);
  const allAccounts = $derived(data.allAccounts as AccountListItem[]);

  const humanOptions = $derived(
    allHumans.map((h) => ({ value: h.id, label: `${h.displayId} ${h.firstName} ${h.lastName}` }))
  );

  const accountOptions = $derived(
    allAccounts.map((a) => ({ value: a.id, label: `${a.displayId} ${a.name}` }))
  );
</script>

<svelte:head>
  <title>New Website - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="New Website"
    breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Websites", href: "/websites" }, { label: "New" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <form method="POST" action="?/create" class="space-y-6 glass-card p-6">
    <div>
      <label for="url" class="block text-sm font-medium text-text-secondary mb-1">URL <span class="text-red-400">*</span></label>
      <input
        id="url" name="url" type="url" required
        class="glass-input block w-full px-3 py-2 text-sm"
        placeholder="https://example.com"
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

    <div class="flex gap-3">
      <Button type="submit">Create Website</Button>
      <a href={resolve('/websites')} class="btn-ghost">Cancel</a>
    </div>
  </form>
</div>
