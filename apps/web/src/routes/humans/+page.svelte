<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";

  let { data }: { data: PageData } = $props();

  type HumanEmail = {
    id: string;
    email: string;
    label: string;
    isPrimary: boolean;
  };

  type Human = {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    status: string;
    emails: HumanEmail[];
    types: string[];
    createdAt: string;
  };

  const humans = $derived(data.humans as Human[]);

  const typeColors: Record<string, string> = {
    client: "bg-[rgba(59,130,246,0.15)] text-blue-300",
    trainer: "bg-[rgba(34,197,94,0.15)] text-green-300",
    travel_agent: "bg-[rgba(168,85,247,0.15)] text-purple-300",
  };

  const statusColors: Record<string, string> = {
    open: "bg-[rgba(59,130,246,0.15)] text-blue-300",
    active: "bg-[rgba(34,197,94,0.15)] text-green-300",
    closed: "bg-[rgba(239,68,68,0.15)] text-red-300",
  };

  const typeLabels: Record<string, string> = {
    client: "Client",
    trainer: "Trainer",
    travel_agent: "Travel Agent",
  };

  function primaryEmail(h: Human): string {
    const primary = h.emails.find((e) => e.isPrimary);
    return primary?.email ?? h.emails[0]?.email ?? "—";
  }

  function displayName(h: Human): string {
    return [h.firstName, h.middleName, h.lastName].filter(Boolean).join(" ");
  }
</script>

<svelte:head>
  <title>Humans - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Humans" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Humans" }]}>
    {#snippet action()}
      <a href="/humans/new" class="btn-primary">Add Human</a>
    {/snippet}
  </PageHeader>

  <div class="glass-card overflow-hidden">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th>Name</th>
          <th>Primary Email</th>
          <th>Status</th>
          <th>Types</th>
          <th class="hidden sm:table-cell">Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each humans as human (human.id)}
          <tr class="glass-row-hover">
            <td class="font-medium">{displayName(human)}</td>
            <td class="text-text-secondary">{primaryEmail(human)}</td>
            <td>
              <StatusBadge status={human.status ?? "open"} colorMap={statusColors} />
            </td>
            <td>
              <div class="flex gap-1 flex-wrap">
                {#each human.types as t}
                  <span class="glass-badge {typeColors[t] ?? 'bg-glass text-text-secondary'}">
                    {typeLabels[t] ?? t}
                  </span>
                {/each}
              </div>
            </td>
            <td class="hidden sm:table-cell text-text-muted">{new Date(human.createdAt).toLocaleDateString()}</td>
            <td>
              <a href="/humans/{human.id}" class="btn-ghost text-xs py-1 px-2">View</a>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="6" class="px-6 py-8 text-center text-sm text-text-muted">No humans found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
