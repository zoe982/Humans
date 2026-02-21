<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";
  import { Users, Building2, ClipboardList, AlertTriangle, RefreshCw } from "lucide-svelte";
</script>

<svelte:head>
  <title>Admin - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Admin Panel" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Admin" }]} />
  <p class="mt-1 text-sm text-text-secondary">Manage colleagues, roles, and system activity.</p>

  <div class="mt-8 grid gap-6 sm:grid-cols-2">
    <a href="/admin/colleagues" class="glass-card p-6 hover:bg-glass-hover transition-colors group">
      <div class="flex items-start gap-4">
        <div class="rounded-lg bg-accent-dim p-3 text-accent">
          <Users size={24} />
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
          <Building2 size={24} />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-text-primary">Label Configuration</h2>
          <p class="mt-1 text-sm text-text-secondary">Manage account types, role labels, and email/phone labels for accounts and humans.</p>
        </div>
      </div>
    </a>

    <a href="/admin/audit-log" class="glass-card p-6 hover:bg-glass-hover transition-colors group">
      <div class="flex items-start gap-4">
        <div class="rounded-lg bg-accent-dim p-3 text-accent">
          <ClipboardList size={24} />
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
          <AlertTriangle size={24} />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-text-primary">Error Log</h2>
          <p class="mt-1 text-sm text-text-secondary">View recent API errors with codes, request IDs, and stack traces.</p>
        </div>
      </div>
    </a>

    <a href="/admin/front-sync" class="glass-card p-6 hover:bg-glass-hover transition-colors group">
      <div class="flex items-start gap-4">
        <div class="rounded-lg bg-accent-dim p-3 text-accent">
          <RefreshCw size={24} />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-text-primary">Front Sync</h2>
          <p class="mt-1 text-sm text-text-secondary">Import conversations from Front.com as activities.</p>
        </div>
      </div>
    </a>
  </div>
</div>
