<script lang="ts">
  import type { PageData, ActionData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type User = {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    googleId: string | null;
    createdAt: string;
  };

  const users = $derived(data.users as User[]);
  let showInvite = $state(false);

  const roleColors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-800",
    manager: "bg-blue-100 text-blue-800",
    agent: "bg-green-100 text-green-800",
    viewer: "bg-gray-100 text-gray-700",
  };
</script>

<svelte:head>
  <title>Users - Admin - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <div class="flex items-center justify-between">
    <div>
      <a href="/admin" class="text-sm text-gray-500 hover:text-gray-700">← Admin</a>
      <h1 class="mt-1 text-2xl font-bold text-gray-900">User Management</h1>
    </div>
    <button
      onclick={() => { showInvite = !showInvite; }}
      class="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
    >
      Invite User
    </button>
  </div>

  {#if form?.error}
    <div class="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{form.error}</div>
  {/if}
  {#if form?.success}
    <div class="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-700">Action completed successfully.</div>
  {/if}

  {#if showInvite}
    <div class="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 class="mb-4 text-lg font-semibold text-gray-900">Invite New User</h2>
      <form method="POST" action="?/invite" class="grid gap-4 sm:grid-cols-3">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            id="name" name="name" type="text" required
            class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email" name="email" type="email" required
            class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="jane@example.com"
          />
        </div>
        <div>
          <label for="role" class="block text-sm font-medium text-gray-700">Role</label>
          <select
            id="role" name="role" required
            class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="viewer">Viewer</option>
            <option value="agent">Agent</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="sm:col-span-3 flex gap-3">
          <button type="submit" class="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
            Send Invite
          </button>
          <button type="button" onclick={() => { showInvite = false; }} class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  {/if}

  <div class="mt-6 overflow-hidden rounded-lg bg-white shadow">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Google</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white">
        {#each users as user (user.id)}
          <tr>
            <td class="px-6 py-4">
              <div>
                <p class="text-sm font-medium text-gray-900">{user.name}</p>
                <p class="text-sm text-gray-500">{user.email}</p>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {roleColors[user.role] ?? 'bg-gray-100 text-gray-700'}">
                {user.role}
              </span>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                {user.isActive ? "Active" : "Inactive"}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              {user.googleId ? "✅ Linked" : "⏳ Pending"}
            </td>
            <td class="px-6 py-4">
              <form method="POST" action="?/update" class="flex items-center gap-2">
                <input type="hidden" name="id" value={user.id} />
                <select
                  name="role"
                  class="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {#each ["viewer", "agent", "manager", "admin"] as r}
                    <option value={r} selected={r === user.role}>{r}</option>
                  {/each}
                </select>
                <input type="hidden" name="isActive" value={String(!user.isActive)} />
                <button
                  type="submit"
                  formaction="?/update"
                  class="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  Update role
                </button>
                <button
                  type="submit"
                  class="rounded px-2 py-1 text-xs font-medium {user.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}"
                >
                  {user.isActive ? "Deactivate" : "Activate"}
                </button>
              </form>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">No users found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
