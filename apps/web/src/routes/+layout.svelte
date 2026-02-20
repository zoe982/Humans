<script lang="ts">
  import "../app.css";
  import type { LayoutData } from "./$types";
  import { page } from "$app/stores";
  import { Search } from "lucide-svelte";
  import MobileNav from "$lib/components/MobileNav.svelte";
  import CommandPalette from "$lib/components/CommandPalette.svelte";
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
      { href: "/geo-interests", label: "Geo-Interests" },
      { href: "/route-interests", label: "Routes" },
    ];
    if (isManager) links.push({ href: "/reports", label: "Reports" });
    links.push(
      { href: "/emails", label: "Emails" },
      { href: "/phone-numbers", label: "Phones" },
      { href: "/social-ids", label: "Social IDs" },
    );
    if (isAdmin) links.push({ href: "/admin", label: "Admin" });
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
            <a href="/dashboard" class="text-xl font-bold text-accent">Humans CRM</a>
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
            <div class="hidden sm:block text-right">
              <p class="text-sm font-medium text-text-primary">{data.user.name}</p>
              <p class="text-xs text-text-muted">{data.user.role}</p>
            </div>
            {#if data.user.avatarUrl}
              <img src={data.user.avatarUrl} alt={data.user.name} class="hidden sm:block h-8 w-8 rounded-full ring-1 ring-glass-border" />
            {/if}
            <form method="POST" action="/logout" class="hidden sm:block">
              <button type="submit" class="rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-glass-hover hover:text-text-primary">
                Sign out
              </button>
            </form>
            <MobileNav
              links={navLinks}
              userName={data.user.name}
              userRole={data.user.role}
              avatarUrl={data.user.avatarUrl}
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
        actionButton: "text-sm font-medium text-accent hover:text-cyan-300 whitespace-nowrap",
      },
    }}
  />
</div>
