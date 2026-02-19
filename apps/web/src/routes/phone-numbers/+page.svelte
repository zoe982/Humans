<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";

  let { data }: { data: PageData } = $props();

  type PhoneNumber = {
    id: string;
    humanId: string;
    phoneNumber: string;
    label: string;
    hasWhatsapp: boolean;
    isPrimary: boolean;
    humanName: string | null;
  };

  const phoneNumbers = $derived(data.phoneNumbers as PhoneNumber[]);
</script>

<svelte:head>
  <title>Phone Numbers - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Phone Numbers" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Phone Numbers" }]} />

  <div class="glass-card overflow-hidden">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th>Human</th>
          <th>Phone Number</th>
          <th>Label</th>
          <th>WhatsApp</th>
          <th>Primary</th>
        </tr>
      </thead>
      <tbody>
        {#each phoneNumbers as phone (phone.id)}
          <tr class="glass-row-hover">
            <td class="font-medium">
              <a href="/humans/{phone.humanId}" class="text-accent hover:text-cyan-300">{phone.humanName ?? "—"}</a>
            </td>
            <td>{phone.phoneNumber}</td>
            <td>
              <span class="glass-badge bg-glass text-text-secondary">{phone.label}</span>
            </td>
            <td class="text-text-muted">{phone.hasWhatsapp ? "Yes" : "—"}</td>
            <td class="text-text-muted">{phone.isPrimary ? "Yes" : "—"}</td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="px-6 py-8 text-center text-sm text-text-muted">No phone numbers found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
