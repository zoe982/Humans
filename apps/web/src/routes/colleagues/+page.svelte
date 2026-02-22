<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";

  let { data }: { data: PageData } = $props();

  type Colleague = {
    id: string;
    displayId: string;
    email: string;
    firstName: string;
    middleNames: string | null;
    lastName: string;
    name: string;
    role: string;
    isActive: boolean;
    googleId: string | null;
    createdAt: string;
  };

  const colleagues = $derived(data.colleagues as Colleague[]);

  const roleColors: Record<string, string> = {
    admin: "badge-purple",
    manager: "badge-blue",
    agent: "badge-green",
    viewer: "bg-glass text-text-secondary",
  };
</script>

<svelte:head>
  <title>Colleagues - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Colleagues"
    breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Colleagues" }]}
  />

  <div class="glass-card overflow-hidden mt-6">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th scope="col">ID</th>
          <th scope="col">Colleague</th>
          <th scope="col">Role</th>
          <th scope="col">Status</th>
          <th scope="col">Google</th>
        </tr>
      </thead>
      <tbody>
        {#each colleagues as colleague (colleague.id)}
          <tr class="glass-row-hover">
            <td class="font-mono text-sm text-text-muted">{colleague.displayId}</td>
            <td>
              <div>
                <p class="font-medium">{colleague.name}</p>
                <p class="text-sm text-text-muted">{colleague.email}</p>
              </div>
            </td>
            <td>
              <span class="glass-badge {roleColors[colleague.role] ?? 'bg-glass text-text-secondary'}">
                {colleague.role}
              </span>
            </td>
            <td>
              <span class="glass-badge {colleague.isActive ? 'badge-green' : 'badge-red'}">
                {colleague.isActive ? "Active" : "Inactive"}
              </span>
            </td>
            <td class="text-text-muted text-sm">
              {colleague.googleId ? "Linked" : "Pending"}
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="px-6 py-8 text-center text-sm text-text-muted">No colleagues found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
