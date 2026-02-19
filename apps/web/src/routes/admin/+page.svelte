<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";
</script>

<svelte:head>
  <title>Admin - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Admin Panel" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Admin" }]} />
  <p class="mt-1 text-sm text-text-secondary">Manage colleagues, roles, and system activity.</p>

  <div class="mt-8 grid gap-6 sm:grid-cols-2">
    <a href="/admin/colleagues" class="glass-card p-6 hover:bg-glass-hover transition-colors group">
      <div class="flex items-start gap-4">
        <div class="rounded-lg bg-accent-dim p-3 text-accent">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-semibold text-text-primary">Colleague Management</h2>
          <p class="mt-1 text-sm text-text-secondary">Invite team members, assign roles, activate or deactivate accounts.</p>
        </div>
      </div>
    </a>

    <a href="/admin/account-config" class="glass-card p-6 hover:bg-glass-hover transition-colors group">
      <div class="flex items-start gap-4">
        <div class="rounded-lg bg-accent-dim p-3 text-accent">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-semibold text-text-primary">Account Configuration</h2>
          <p class="mt-1 text-sm text-text-secondary">Manage account types, role labels, email labels, and phone labels.</p>
        </div>
      </div>
    </a>

    <a href="/admin/audit-log" class="glass-card p-6 hover:bg-glass-hover transition-colors group">
      <div class="flex items-start gap-4">
        <div class="rounded-lg bg-accent-dim p-3 text-accent">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-semibold text-text-primary">Audit Log</h2>
          <p class="mt-1 text-sm text-text-secondary">Review all system activity — who did what, when, and from where.</p>
        </div>
      </div>
    </a>

    <a href="/admin/error-log" class="glass-card p-6 hover:bg-glass-hover transition-colors group">
      <div class="flex items-start gap-4">
        <div class="rounded-lg bg-accent-dim p-3 text-accent">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-semibold text-text-primary">Error Log</h2>
          <p class="mt-1 text-sm text-text-secondary">View recent API errors with codes, request IDs, and stack traces.</p>
        </div>
      </div>
    </a>
  </div>
</div>
