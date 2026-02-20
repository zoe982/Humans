<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";

  let { data } = $props();

  type Colleague = {
    id: string;
    displayId: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
  };

  const colleagues = $derived((data.colleagues ?? []) as Colleague[]);
</script>

<svelte:head>
  <title>Reports - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Reports" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }]} />

  <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a href="/emails" class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Emails</h2>
      <p class="mt-2 text-sm text-text-secondary">View and manage all email addresses across humans and accounts.</p>
    </a>
    <a href="/phone-numbers" class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Phone Numbers</h2>
      <p class="mt-2 text-sm text-text-secondary">View and manage all phone numbers across humans and accounts.</p>
    </a>
    <a href="/social-ids" class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Social Media IDs</h2>
      <p class="mt-2 text-sm text-text-secondary">View and manage all social media handles and profiles.</p>
    </a>
  </div>

  <!-- Colleagues -->
  {#if colleagues.length > 0}
    <div class="mt-8">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Colleagues</h2>
      <div class="glass-card overflow-hidden">
        <table class="min-w-full text-sm">
          <thead class="glass-thead">
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each colleagues as colleague (colleague.id)}
              <tr class="glass-row-hover">
                <td class="font-mono text-xs text-accent">{colleague.displayId}</td>
                <td class="font-medium text-text-primary">{colleague.name}</td>
                <td class="text-text-secondary">{colleague.email}</td>
                <td>
                  <span class="glass-badge bg-glass text-text-secondary capitalize">{colleague.role}</span>
                </td>
                <td>
                  {#if colleague.isActive}
                    <span class="inline-flex items-center rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">Active</span>
                  {:else}
                    <span class="inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">Inactive</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
