<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";

  let { data }: { data: PageData } = $props();

  type Email = {
    id: string;
    humanId: string;
    email: string;
    label: string;
    isPrimary: boolean;
    humanName: string | null;
  };

  const emails = $derived(data.emails as Email[]);

  const labelColors: Record<string, string> = {
    work: "bg-[rgba(59,130,246,0.15)] text-blue-300",
    personal: "bg-[rgba(34,197,94,0.15)] text-green-300",
    other: "bg-glass text-text-secondary",
  };
</script>

<svelte:head>
  <title>Emails - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Emails" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Emails" }]} />

  <div class="glass-card overflow-hidden">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th>Human</th>
          <th>Email</th>
          <th>Label</th>
          <th>Primary</th>
        </tr>
      </thead>
      <tbody>
        {#each emails as email (email.id)}
          <tr class="glass-row-hover">
            <td class="font-medium">
              <a href="/humans/{email.humanId}" class="text-accent hover:text-cyan-300">{email.humanName ?? "—"}</a>
            </td>
            <td>{email.email}</td>
            <td>
              <span class="glass-badge {labelColors[email.label] ?? 'bg-glass text-text-secondary'}">{email.label}</span>
            </td>
            <td class="text-text-muted">{email.isPrimary ? "Yes" : "—"}</td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="px-6 py-8 text-center text-sm text-text-muted">No emails found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
