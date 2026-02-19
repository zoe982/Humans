<script lang="ts">
  import "../app.css";
  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children: import("svelte").Snippet } = $props();

  const isManager = $derived(data.user?.role === "manager" || data.user?.role === "admin");
  const isAdmin = $derived(data.user?.role === "admin");
</script>

<div class="min-h-screen bg-gray-50">
  {#if data.user}
    <nav class="border-b border-gray-200 bg-white shadow-sm">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <div class="flex items-center gap-8">
            <a href="/dashboard" class="text-xl font-bold text-blue-700">Humans CRM</a>
            <div class="hidden sm:flex sm:gap-1">
              <a href="/dashboard" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Dashboard</a>
              <a href="/clients" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Clients</a>
              <a href="/flights" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Flights</a>
              <a href="/leads" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Leads</a>
              {#if isManager}
                <a href="/reports" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Reports</a>
              {/if}
              {#if isAdmin}
                <a href="/admin" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Admin</a>
              {/if}
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="hidden sm:block text-right">
              <p class="text-sm font-medium text-gray-900">{data.user.name}</p>
              <p class="text-xs text-gray-500">{data.user.role}</p>
            </div>
            {#if data.user.avatarUrl}
              <img src={data.user.avatarUrl} alt={data.user.name} class="h-8 w-8 rounded-full" />
            {/if}
            <form method="POST" action="/logout">
              <button type="submit" class="rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  {/if}

  <main>
    {@render children()}
  </main>
</div>
