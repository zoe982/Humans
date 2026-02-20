<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type ConfigItem = { id: string; name: string; createdAt: string };

  const accountTypes = $derived(data.accountTypes as ConfigItem[]);
  const humanLabels = $derived(data.humanLabels as ConfigItem[]);
  const emailLabels = $derived(data.emailLabels as ConfigItem[]);
  const phoneLabels = $derived(data.phoneLabels as ConfigItem[]);
  const humanEmailLabels = $derived(data.humanEmailLabels as ConfigItem[]);
  const humanPhoneLabels = $derived(data.humanPhoneLabels as ConfigItem[]);
</script>

<svelte:head>
  <title>Labels & Configuration - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Labels & Configuration"
    breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Label Configuration" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}
  {#if form?.success}
    <AlertBanner type="success" message="Saved successfully." />
  {/if}

  <div class="mt-8 grid gap-6 sm:grid-cols-2">
    <!-- Account Types -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Account Types</h2>
      {#if accountTypes.length === 0}
        <p class="text-text-muted text-sm mb-4">No account types yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each accountTypes as item (item.id)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              <span class="text-sm text-text-primary">{item.name}</span>
              <form method="POST" action="?/deleteAccountType">
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" class="text-red-400 hover:text-red-300 text-sm">Remove</button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createAccountType" class="flex gap-2">
        <input name="name" type="text" required placeholder="New account type..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <button type="submit" class="btn-primary text-sm">Add</button>
      </form>
    </div>

    <!-- Human-Account Labels -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Human-Account Role Labels</h2>
      {#if humanLabels.length === 0}
        <p class="text-text-muted text-sm mb-4">No role labels yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each humanLabels as item (item.id)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              <span class="text-sm text-text-primary">{item.name}</span>
              <form method="POST" action="?/deleteHumanLabel">
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" class="text-red-400 hover:text-red-300 text-sm">Remove</button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createHumanLabel" class="flex gap-2">
        <input name="name" type="text" required placeholder="New role label..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <button type="submit" class="btn-primary text-sm">Add</button>
      </form>
    </div>

    <!-- Email Labels -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Account Email Labels</h2>
      {#if emailLabels.length === 0}
        <p class="text-text-muted text-sm mb-4">No email labels yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each emailLabels as item (item.id)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              <span class="text-sm text-text-primary">{item.name}</span>
              <form method="POST" action="?/deleteEmailLabel">
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" class="text-red-400 hover:text-red-300 text-sm">Remove</button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createEmailLabel" class="flex gap-2">
        <input name="name" type="text" required placeholder="New email label..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <button type="submit" class="btn-primary text-sm">Add</button>
      </form>
    </div>

    <!-- Phone Labels -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Account Phone Labels</h2>
      {#if phoneLabels.length === 0}
        <p class="text-text-muted text-sm mb-4">No phone labels yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each phoneLabels as item (item.id)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              <span class="text-sm text-text-primary">{item.name}</span>
              <form method="POST" action="?/deletePhoneLabel">
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" class="text-red-400 hover:text-red-300 text-sm">Remove</button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createPhoneLabel" class="flex gap-2">
        <input name="name" type="text" required placeholder="New phone label..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <button type="submit" class="btn-primary text-sm">Add</button>
      </form>
    </div>

    <!-- Human Email Labels -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Human Email Labels</h2>
      {#if humanEmailLabels.length === 0}
        <p class="text-text-muted text-sm mb-4">No human email labels yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each humanEmailLabels as item (item.id)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              <span class="text-sm text-text-primary">{item.name}</span>
              <form method="POST" action="?/deleteHumanEmailLabel">
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" class="text-red-400 hover:text-red-300 text-sm">Remove</button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createHumanEmailLabel" class="flex gap-2">
        <input name="name" type="text" required placeholder="New email label..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <button type="submit" class="btn-primary text-sm">Add</button>
      </form>
    </div>

    <!-- Human Phone Labels -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Human Phone Labels</h2>
      {#if humanPhoneLabels.length === 0}
        <p class="text-text-muted text-sm mb-4">No human phone labels yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each humanPhoneLabels as item (item.id)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              <span class="text-sm text-text-primary">{item.name}</span>
              <form method="POST" action="?/deleteHumanPhoneLabel">
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" class="text-red-400 hover:text-red-300 text-sm">Remove</button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createHumanPhoneLabel" class="flex gap-2">
        <input name="name" type="text" required placeholder="New phone label..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <button type="submit" class="btn-primary text-sm">Add</button>
      </form>
    </div>
  </div>
</div>
