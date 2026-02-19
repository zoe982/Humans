<script lang="ts">
  import "../app.css";
  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children: import("svelte").Snippet } = $props();

  const isManager = $derived(data.user?.role === "manager" || data.user?.role === "admin");
  const isAdmin = $derived(data.user?.role === "admin");
</script>

<div class="min-h-screen">
  {#if data.user}
    <nav class="glass-nav sticky top-0 z-50">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <div class="flex items-center gap-8">
            <a href="/dashboard" class="text-xl font-bold text-accent">Humans CRM</a>
            <div class="hidden sm:flex sm:gap-1">
              <a href="/dashboard" class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-glass-hover hover:text-text-primary">Dashboard</a>
              <a href="/leads" class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-glass-hover hover:text-text-primary">Leads</a>
              <a href="/humans" class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-glass-hover hover:text-text-primary">Humans</a>
              <a href="/accounts" class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-glass-hover hover:text-text-primary">Accounts</a>
              <a href="/activities" class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-glass-hover hover:text-text-primary">Activities</a>
              <a href="/flights" class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-glass-hover hover:text-text-primary">Flights</a>
              <a href="/geo-interests" class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-glass-hover hover:text-text-primary">Geo-Interests</a>
              {#if isManager}
                <a href="/reports" class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-glass-hover hover:text-text-primary">Reports</a>
              {/if}
              {#if isAdmin}
                <a href="/admin" class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-glass-hover hover:text-text-primary">Admin</a>
              {/if}
            </div>
          </div>
          <div class="flex items-center gap-4">
            <a href="/search" class="rounded-md px-2 py-2 text-text-muted hover:bg-glass-hover hover:text-text-primary" title="Search">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </a>
            <div class="hidden sm:block text-right">
              <p class="text-sm font-medium text-text-primary">{data.user.name}</p>
              <p class="text-xs text-text-muted">{data.user.role}</p>
            </div>
            {#if data.user.avatarUrl}
              <img src={data.user.avatarUrl} alt={data.user.name} class="h-8 w-8 rounded-full ring-1 ring-glass-border" />
            {/if}
            <form method="POST" action="/logout">
              <button type="submit" class="rounded-md px-3 py-2 text-sm font-medium text-text-muted hover:bg-glass-hover hover:text-text-primary">
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
