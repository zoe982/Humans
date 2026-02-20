<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";

  let { data }: { data: PageData } = $props();

  type Email = {
    id: string;
    displayId: string;
    ownerType: string;
    ownerId: string;
    email: string;
    labelName: string | null;
    isPrimary: boolean;
    ownerName: string | null;
    ownerDisplayId: string | null;
  };

  const emails = $derived(data.emails as Email[]);

  let search = $state("");

  const filtered = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return emails;
    return emails.filter((e) =>
      e.email.toLowerCase().includes(q) ||
      (e.ownerName?.toLowerCase().includes(q)) ||
      (e.ownerDisplayId?.toLowerCase().includes(q)) ||
      (e.labelName?.toLowerCase().includes(q)) ||
      e.displayId.toLowerCase().includes(q)
    );
  });

  const labelColors: Record<string, string> = {
    work: "bg-[rgba(59,130,246,0.15)] text-blue-300",
    personal: "bg-[rgba(34,197,94,0.15)] text-green-300",
    other: "bg-glass text-text-secondary",
  };

  function ownerHref(e: Email): string {
    return e.ownerType === "human" ? `/humans/${e.ownerId}` : `/accounts/${e.ownerId}`;
  }
</script>

<svelte:head>
  <title>Emails - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Emails" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports", href: "/reports" }, { label: "Emails" }]}>
    {#snippet action()}
      <a href="/emails/new" class="btn-primary">Add Email</a>
    {/snippet}
  </PageHeader>

  <div class="mb-4">
    <input
      type="text"
      placeholder="Search emails, owners, labels..."
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
          <th>Email</th>
          <th>Label</th>
          <th>Primary</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as email (email.id)}
          <tr class="glass-row-hover">
            <td class="font-mono text-sm"><a href="/emails/{email.id}" class="text-accent hover:text-cyan-300">{email.displayId}</a></td>
            <td class="font-medium">
              <a href={ownerHref(email)} class="text-accent hover:text-cyan-300">{email.ownerName ?? "—"}</a>
              {#if email.ownerDisplayId}
                <span class="ml-1 text-xs text-text-muted">{email.ownerDisplayId}</span>
              {/if}
            </td>
            <td>{email.email}</td>
            <td>
              {#if email.labelName}
                <span class="glass-badge {labelColors[email.labelName.toLowerCase()] ?? 'bg-glass text-text-secondary'}">{email.labelName}</span>
              {:else}
                <span class="text-text-muted">—</span>
              {/if}
            </td>
            <td class="text-text-muted">{email.isPrimary ? "Yes" : "—"}</td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="px-6 py-8 text-center text-sm text-text-muted">{search ? "No matching emails." : "No emails found."}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
