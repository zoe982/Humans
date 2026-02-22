<script lang="ts">
  import { page } from "$app/stores";
  import { Menu, Shield } from "lucide-svelte";
  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  type NavLink = {
    href: string;
    label: string;
  };

  type Props = {
    links: NavLink[];
    userName: string;
    userRole: string;
    avatarUrl?: string | null;
    isAdmin?: boolean;
  };

  let { links, userName, userRole, avatarUrl, isAdmin = false }: Props = $props();

  let open = $state(false);

  function close() {
    open = false;
  }

  function isActive(href: string): boolean {
    const path = $page.url.pathname;
    if (href === "/dashboard") return path === "/dashboard";
    return path.startsWith(href);
  }
</script>

<div class="sm:hidden">
  <button
    type="button"
    class="rounded-lg p-2 text-text-muted hover:bg-glass-hover hover:text-text-primary"
    aria-label={open ? "Close menu" : "Open menu"}
    aria-expanded={open}
    onclick={() => { open = !open; }}
  >
    <Menu size={24} />
  </button>

  <Sheet.Root bind:open>
    <Sheet.Content side="left" class="w-72 sm:max-w-72 p-0">
      <nav aria-label="Mobile navigation" class="flex flex-col h-full">
        <!-- User header -->
        <div class="flex items-center gap-3 p-5 border-b border-glass-border">
          {#if avatarUrl}
            <img src={avatarUrl} alt={userName} class="h-10 w-10 rounded-full ring-1 ring-glass-border" />
          {/if}
          <div class="flex-1">
            <p class="text-sm font-medium text-text-primary">{userName}</p>
            <p class="text-xs text-text-muted">{userRole}</p>
          </div>
          {#if isAdmin}
            <a
              href="/admin"
              onclick={close}
              class="rounded-lg p-2 text-text-muted hover:bg-glass-hover hover:text-text-primary transition-colors"
              aria-label="Admin"
            >
              <Shield size={18} />
            </a>
          {/if}
          <ThemeToggle />
        </div>

        <!-- Nav links -->
        <div class="flex-1 p-3 space-y-1">
          {#each links as link}
            <a
              href={link.href}
              onclick={close}
              class="flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors
                {isActive(link.href)
                  ? 'bg-glass text-text-primary'
                  : 'text-text-secondary hover:bg-glass-hover hover:text-text-primary'}"
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </a>
          {/each}
        </div>

        <!-- Sign out -->
        <div class="p-3 border-t border-glass-border">
          <form method="POST" action="/logout">
            <button
              type="submit"
              class="w-full flex items-center rounded-lg px-4 py-3 text-sm font-medium text-text-muted hover:bg-glass-hover hover:text-text-primary"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
    </Sheet.Content>
  </Sheet.Root>
</div>
