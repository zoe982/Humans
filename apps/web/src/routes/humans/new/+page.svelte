<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import TypeTogglePills from "$lib/components/TypeTogglePills.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type ConfigItem = { id: string; name: string; createdAt: string };

  const prefill = $derived(data.prefill);
  const emailLabelConfigs = $derived(data.emailLabelConfigs as ConfigItem[]);

  let emailRows = $state([
    { email: prefill.email || "", labelId: "", isPrimary: true },
  ]);

  function addEmail() {
    emailRows = [...emailRows, { email: "", labelId: "", isPrimary: false }];
  }

  function removeEmail(index: number) {
    if (emailRows.length <= 1) return;
    emailRows = emailRows.filter((_, i) => i !== index);
    if (!emailRows.some((e) => e.isPrimary) && emailRows.length > 0) {
      emailRows[0].isPrimary = true;
    }
  }

  function setPrimary(index: number) {
    emailRows = emailRows.map((e, i) => ({ ...e, isPrimary: i === index }));
  }
</script>

<svelte:head>
  <title>New Human - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title={prefill.fromSignup ? "Convert Signup to Human" : "New Human"}
    breadcrumbs={[{ label: "Humans", href: "/humans" }, { label: "New" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <form method="POST" action="?/create" class="space-y-6 glass-card p-6">
    {#if prefill.fromSignup}
      <input type="hidden" name="fromSignup" value={prefill.fromSignup} />
    {/if}

    <div class="grid gap-4 sm:grid-cols-3">
      <div>
        <label for="firstName" class="block text-sm font-medium text-text-secondary mb-1">First Name</label>
        <input
          id="firstName" name="firstName" type="text" required
          value={prefill.firstName}
          class="glass-input block w-full px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label for="middleName" class="block text-sm font-medium text-text-secondary mb-1">Middle Name</label>
        <input
          id="middleName" name="middleName" type="text"
          value={prefill.middleName}
          class="glass-input block w-full px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label for="lastName" class="block text-sm font-medium text-text-secondary mb-1">Last Name</label>
        <input
          id="lastName" name="lastName" type="text" required
          value={prefill.lastName}
          class="glass-input block w-full px-3 py-2 text-sm"
        />
      </div>
    </div>

    <!-- Emails -->
    <div>
      <div class="flex items-center justify-between">
        <label class="block text-sm font-medium text-text-secondary">Emails</label>
        <button type="button" onclick={addEmail} class="text-sm text-accent hover:text-cyan-300">+ Add email</button>
      </div>
      <div class="mt-2 space-y-2">
        {#each emailRows as row, i}
          <div class="flex items-center gap-2">
            <input
              type="email" name="emails[{i}].email" required
              bind:value={row.email}
              placeholder="email@example.com"
              class="glass-input flex-1 px-3 py-2 text-sm"
            />
            <select
              name="emails[{i}].labelId"
              bind:value={row.labelId}
              class="glass-input px-2 py-2 text-sm"
            >
              <option value="">None</option>
              {#each emailLabelConfigs as l (l.id)}
                <option value={l.id}>{l.name}</option>
              {/each}
            </select>
            <label class="flex items-center gap-1 text-xs text-text-muted">
              <input
                type="radio" name="primaryEmail" value={String(i)}
                checked={row.isPrimary}
                onchange={() => setPrimary(i)}
              />
              Primary
            </label>
            {#if emailRows.length > 1}
              <button type="button" onclick={() => removeEmail(i)} class="text-red-400 hover:text-red-300 text-sm">Remove</button>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Types -->
    <div>
      <label class="block text-sm font-medium text-text-secondary">Types <span class="text-red-400">*</span></label>
      <div class="mt-2">
        <TypeTogglePills />
      </div>
    </div>

    <div class="flex gap-3">
      <button type="submit" class="btn-primary">
        {prefill.fromSignup ? "Create & Convert" : "Create Human"}
      </button>
      <a href={prefill.fromSignup ? "/leads/route-signups" : "/humans"} class="btn-ghost">
        Cancel
      </a>
    </div>
  </form>
</div>
