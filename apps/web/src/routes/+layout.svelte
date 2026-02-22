<script lang="ts">
  import "../app.css";
  import type { LayoutData } from "./$types";
  import { page } from "$app/stores";
  import { Search, Users } from "lucide-svelte";
  import MobileNav from "$lib/components/MobileNav.svelte";
  import CommandPalette from "$lib/components/CommandPalette.svelte";
  import AccountDropdown from "$lib/components/AccountDropdown.svelte";
  import { Toaster } from "svelte-sonner";

  let commandPaletteOpen = $state(false);

  let { data, children }: { data: LayoutData; children: import("svelte").Snippet } = $props();

  const isManager = $derived(data.user?.role === "manager" || data.user?.role === "admin");
  const isAdmin = $derived(data.user?.role === "admin");

  const navLinks = $derived.by(() => {
    const links = [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/leads", label: "Leads" },
      { href: "/humans", label: "Humans" },
      { href: "/pets", label: "Pets" },
      { href: "/accounts", label: "Accounts" },
      { href: "/activities", label: "Activities" },
      { href: "/opportunities", label: "Opportunities" },
      { href: "/flights", label: "Flights" },
    ];
    if (isManager) links.push({ href: "/reports", label: "Reports" });
    return links;
  });

  function isActive(href: string): boolean {
    const path = $page.url.pathname;
    if (href === "/dashboard") return path === "/dashboard";
    return path.startsWith(href);
  }
</script>

<svelte:window onkeydown={(e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    commandPaletteOpen = !commandPaletteOpen;
  }
}} />

<a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:btn-primary focus:px-4 focus:py-2">
  Skip to main content
</a>

<CommandPalette bind:open={commandPaletteOpen} />

<div class="min-h-screen">
  {#if data.user}
    <nav aria-label="Main navigation" class="glass-nav sticky top-0 z-50">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <div class="flex items-center gap-8">
            <a href="/dashboard" class="text-xl font-bold text-accent inline-flex items-center gap-2">
              <Users size={22} /> Humans
            </a>
            <div class="hidden sm:flex sm:gap-1">
              {#each navLinks as link}
                <a
                  href={link.href}
                  class="rounded-lg px-3 py-2 text-sm font-medium transition-colors
                    {isActive(link.href)
                      ? 'bg-glass text-text-primary'
                      : 'text-text-secondary hover:bg-glass-hover hover:text-text-primary'}"
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  {link.label}
                </a>
              {/each}
            </div>
          </div>
          <div class="flex items-center gap-4">
            <button type="button" onclick={() => { commandPaletteOpen = true; }} class="rounded-lg px-2 py-2 text-text-muted hover:bg-glass-hover hover:text-text-primary inline-flex items-center gap-2" aria-label="Search (Cmd+K)">
              <Search size={20} />
              <kbd class="hidden sm:inline-flex text-xs text-text-muted border border-glass-border rounded px-1.5 py-0.5">⌘K</kbd>
            </button>
            <AccountDropdown
              userName={data.user.name}
              userRole={data.user.role}
              avatarUrl={data.user.avatarUrl}
              {isAdmin}
            />
            <MobileNav
              links={navLinks}
              userName={data.user.name}
              userRole={data.user.role}
              avatarUrl={data.user.avatarUrl}
              {isAdmin}
            />
          </div>
        </div>
      </div>
    </nav>
  {/if}

  <main id="main-content">
    {@render children()}
  </main>

  <Toaster
    position="bottom-right"
    toastOptions={{
      unstyled: true,
      classes: {
        toast: "glass-card-strong p-4 shadow-xl max-w-sm flex items-center gap-3",
        title: "text-sm text-text-primary",
        actionButton: "text-sm font-medium text-accent hover:text-[var(--link-hover)] whitespace-nowrap",
      },
    }}
  />
</div>
