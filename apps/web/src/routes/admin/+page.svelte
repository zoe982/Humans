<svelte:head>
  <title>Admin - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <h1 class="text-2xl font-bold text-gray-900">Admin Panel</h1>

  <div class="mt-6 grid gap-6 lg:grid-cols-2">
    <div class="rounded-lg bg-white p-6 shadow">
      <h2 class="text-lg font-semibold text-gray-900">User Management</h2>
      <p class="mt-2 text-gray-500">Manage team members and their roles.</p>
      <a href="/admin/users" class="mt-4 inline-block text-brand hover:text-brand-dark">Manage Users</a>
    </div>
    <div class="rounded-lg bg-white p-6 shadow">
      <h2 class="text-lg font-semibold text-gray-900">Audit Log</h2>
      <p class="mt-2 text-gray-500">View all system activity.</p>
      <a href="/admin/audit-log" class="mt-4 inline-block text-brand hover:text-brand-dark">View Log</a>
    </div>
  </div>
</div>
