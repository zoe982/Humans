<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";
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
</div>
