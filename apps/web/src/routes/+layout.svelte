<script lang="ts">
  import "../app.css";
  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children: import("svelte").Snippet } = $props();
</script>

<div class="min-h-screen bg-gray-50">
  {#if data.user}
    <nav class="border-b border-gray-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 justify-between">
          <div class="flex items-center gap-8">
            <a href="/dashboard" class="text-xl font-bold text-brand">Humans CRM</a>
            <div class="hidden sm:flex sm:gap-4">
              <a href="/dashboard" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Dashboard</a>
              <a href="/clients" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Clients</a>
              <a href="/flights" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Flights</a>
              <a href="/leads" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Leads</a>
              {#if data.user.role === "manager" || data.user.role === "admin"}
                <a href="/reports" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Reports</a>
              {/if}
              {#if data.user.role === "admin"}
                <a href="/admin" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Admin</a>
              {/if}
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-sm text-gray-600">{data.user.name}</span>
            <form method="POST" action="/logout">
              <button type="submit" class="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
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
