<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";

  let { data }: { data: PageData } = $props();

  type PhoneNumber = {
    id: string;
    displayId: string;
    ownerType: string;
    ownerId: string;
    phoneNumber: string;
    labelName: string | null;
    hasWhatsapp: boolean;
    isPrimary: boolean;
    ownerName: string | null;
    ownerDisplayId: string | null;
  };

  const phoneNumbers = $derived(data.phoneNumbers as PhoneNumber[]);

  let search = $state("");

  const filtered = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return phoneNumbers;
    return phoneNumbers.filter((p) =>
      p.phoneNumber.toLowerCase().includes(q) ||
      (p.ownerName?.toLowerCase().includes(q)) ||
      (p.ownerDisplayId?.toLowerCase().includes(q)) ||
      (p.labelName?.toLowerCase().includes(q)) ||
      p.displayId.toLowerCase().includes(q)
    );
  });

  function ownerHref(p: PhoneNumber): string {
    return p.ownerType === "human" ? `/humans/${p.ownerId}` : `/accounts/${p.ownerId}`;
  }
</script>

<svelte:head>
  <title>Phone Numbers - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Phone Numbers" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Phone Numbers" }]} />

  <div class="mb-4">
    <input
      type="text"
      placeholder="Search phones, owners, labels..."
      bind:value={search}
      class="glass-input w-full px-3 py-2 text-sm sm:max-w-sm"
    />
  </div>

  <div class="glass-card overflow-hidden">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th>ID</th>
          <th>Owner</th>
          <th>Phone Number</th>
          <th>Label</th>
          <th>WhatsApp</th>
          <th>Primary</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as phone (phone.id)}
          <tr class="glass-row-hover">
            <td class="font-mono text-sm text-text-muted">{phone.displayId}</td>
            <td class="font-medium">
              <a href={ownerHref(phone)} class="text-accent hover:text-cyan-300">{phone.ownerName ?? "—"}</a>
              {#if phone.ownerDisplayId}
                <span class="ml-1 text-xs text-text-muted">{phone.ownerDisplayId}</span>
              {/if}
            </td>
            <td>{phone.phoneNumber}</td>
            <td>
              {#if phone.labelName}
                <span class="glass-badge bg-glass text-text-secondary">{phone.labelName}</span>
              {:else}
                <span class="text-text-muted">—</span>
              {/if}
            </td>
            <td class="text-text-muted">{phone.hasWhatsapp ? "Yes" : "—"}</td>
            <td class="text-text-muted">{phone.isPrimary ? "Yes" : "—"}</td>
          </tr>
        {:else}
          <tr>
            <td colspan="6" class="px-6 py-8 text-center text-sm text-text-muted">{search ? "No matching phone numbers." : "No phone numbers found."}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
