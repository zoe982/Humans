<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import TypeTogglePills from "$lib/components/TypeTogglePills.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const prefill = $derived(data.prefill);
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
