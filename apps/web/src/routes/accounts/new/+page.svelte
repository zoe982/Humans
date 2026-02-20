<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type ConfigItem = { id: string; name: string };
  const accountTypes = $derived(data.accountTypes as ConfigItem[]);
</script>

<svelte:head>
  <title>New Account - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="New Account"
    breadcrumbs={[{ label: "Accounts", href: "/accounts" }, { label: "New" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <form method="POST" action="?/create" class="space-y-6 glass-card p-6">
    <div>
      <label for="accountName" class="block text-sm font-medium text-text-secondary mb-1">Account Name</label>
      <input
        id="accountName" name="name" type="text" required
        class="glass-input block w-full px-3 py-2 text-sm"
        placeholder="e.g. Acme Corp"
      />
    </div>

    {#if accountTypes.length > 0}
      <div>
        <label class="block text-sm font-medium text-text-secondary">Types</label>
        <div class="mt-2 flex gap-4 flex-wrap">
          {#each accountTypes as t (t.id)}
            <label class="flex items-center gap-2 text-sm text-text-primary">
              <input type="checkbox" name="typeIds" value={t.id} class="rounded border-glass-border bg-glass text-accent focus:ring-accent" />
              {t.name}
            </label>
          {/each}
        </div>
      </div>
    {/if}

    <div class="flex gap-3">
      <button type="submit" class="btn-primary">Create Account</button>
      <a href="/accounts" class="btn-ghost">Cancel</a>
    </div>
  </form>
</div>
