<script lang="ts">
  import { page } from "$app/stores";
  import { Menu, X } from "lucide-svelte";

  type NavLink = {
    href: string;
    label: string;
  };

  type Props = {
    links: NavLink[];
    userName: string;
    userRole: string;
    avatarUrl?: string | null;
  };

  let { links, userName, userRole, avatarUrl }: Props = $props();

  let open = $state(false);

  function close() {
    open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  function isActive(href: string): boolean {
    const path = $page.url.pathname;
    if (href === "/dashboard") return path === "/dashboard";
    return path.startsWith(href);
  }
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

<button
  type="button"
  class="sm:hidden rounded-lg p-2 text-text-muted hover:bg-glass-hover hover:text-text-primary"
  aria-label={open ? "Close menu" : "Open menu"}
  aria-expanded={open}
  onclick={() => { open = !open; }}
>
  {#if open}
    <X size={24} />
  {:else}
    <Menu size={24} />
  {/if}
</button>

{#if open}
  <!-- Backdrop -->
  <button
    type="button"
    class="fixed inset-0 z-50 bg-black/50 sm:hidden"
    aria-label="Close menu"
    onclick={close}
    tabindex="-1"
  ></button>

  <!-- Drawer -->
  <nav
    aria-label="Mobile navigation"
    class="fixed top-0 left-0 bottom-0 z-60 w-72 glass-card-strong sm:hidden overflow-y-auto animate-slide-in"
  >
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="flex items-center gap-3 p-5 border-b border-glass-border">
        {#if avatarUrl}
          <img src={avatarUrl} alt={userName} class="h-10 w-10 rounded-full ring-1 ring-glass-border" />
        {/if}
        <div>
          <p class="text-sm font-medium text-text-primary">{userName}</p>
          <p class="text-xs text-text-muted">{userRole}</p>
        </div>
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
    </div>
  </nav>
{/if}

<style>
  @keyframes slide-in {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
  .animate-slide-in {
    animation: slide-in 0.2s ease-out;
  }
</style>
