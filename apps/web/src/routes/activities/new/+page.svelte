<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import GeoInterestPicker from "$lib/components/GeoInterestPicker.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Human = {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
  };
  type Account = { id: string; name: string };

  const humans = $derived(data.humans as Human[]);
  const accountsList = $derived(data.accounts as Account[]);
  const apiUrl = $derived(data.apiUrl as string);
  let selectedType = $state("email");
  let showGeoInterest = $state(false);

  function displayName(h: Human): string {
    return [h.firstName, h.middleName, h.lastName].filter(Boolean).join(" ");
  }
</script>

<svelte:head>
  <title>New Activity - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="New Activity"
    breadcrumbs={[{ label: "Activities", href: "/activities" }, { label: "New" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <form method="POST" action="?/create" class="space-y-6 glass-card p-6">
    <div>
      <label for="type" class="block text-sm font-medium text-text-secondary mb-1">Type</label>
      <select id="type" name="type" required bind:value={selectedType} class="glass-input block w-full px-3 py-2 text-sm">
        <option value="email">Email</option>
        <option value="whatsapp_message">WhatsApp</option>
        <option value="online_meeting">Meeting</option>
        <option value="phone_call">Phone Call</option>
      </select>
    </div>

    {#if selectedType === "email"}
    <div>
      <label for="subject" class="block text-sm font-medium text-text-secondary mb-1">Subject</label>
      <input
        id="subject" name="subject" type="text" required maxlength={500}
        class="glass-input block w-full px-3 py-2 text-sm"
        placeholder="Brief description of the activity"
      />
    </div>
    {/if}

    <div>
      <label for="notes" class="block text-sm font-medium text-text-secondary mb-1">Notes</label>
      <textarea
        id="notes" name="notes" rows={4} maxlength={10000}
        class="glass-input block w-full px-3 py-2 text-sm"
        placeholder="Optional notes..."
      ></textarea>
    </div>

    <div>
      <label for="activityDate" class="block text-sm font-medium text-text-secondary mb-1">Activity Date</label>
      <input
        id="activityDate" name="activityDate" type="datetime-local" required
        class="glass-input block w-full px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label for="humanId" class="block text-sm font-medium text-text-secondary mb-1">Linked Human</label>
      <select id="humanId" name="humanId" class="glass-input block w-full px-3 py-2 text-sm">
        <option value="">— Select a human —</option>
        {#each humans as human (human.id)}
          <option value={human.id}>{displayName(human)}</option>
        {/each}
      </select>
      <p class="mt-1 text-xs text-text-muted">A linked human is required.</p>
    </div>

    <div>
      <label for="accountId" class="block text-sm font-medium text-text-secondary mb-1">Linked Account</label>
      <select id="accountId" name="accountId" class="glass-input block w-full px-3 py-2 text-sm">
        <option value="">— None —</option>
        {#each accountsList as account (account.id)}
          <option value={account.id}>{account.name}</option>
        {/each}
      </select>
    </div>

    <div>
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          class="rounded border-glass-border"
          bind:checked={showGeoInterest}
        />
        Link a Geo-Interest?
      </label>
    </div>
    {#if showGeoInterest}
      <div class="p-3 rounded-lg bg-glass border border-glass-border">
        <GeoInterestPicker
          {apiUrl}
          geoInterestIdName="geoInterestId"
          cityName="geoCity"
          countryName="geoCountry"
          notesName="geoNotes"
        />
      </div>
    {/if}

    <div class="flex gap-3">
      <button type="submit" class="btn-primary">Create Activity</button>
      <a href="/activities" class="btn-ghost">Cancel</a>
    </div>
  </form>
</div>
