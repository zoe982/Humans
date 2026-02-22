<script lang="ts">
  import { Sun, Moon, Shield, LogOut } from "lucide-svelte";
  import * as Popover from "$lib/components/ui/popover";
  import { toggleTheme, currentTheme } from "$lib/stores/theme.svelte";

  type Props = {
    userName: string;
    userRole: string;
    avatarUrl?: string | null;
    isAdmin: boolean;
  };

  let { userName, userRole, avatarUrl, isAdmin }: Props = $props();
  let open = $state(false);
</script>

<Popover.Root bind:open>
  <Popover.Trigger asChild>
    {#snippet children({ props })}
      <button
        {...props}
        type="button"
        class="hidden sm:flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 cursor-pointer
               transition-colors duration-150 hover:bg-white/[0.08]
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <div class="text-right">
          <p class="text-sm font-medium leading-snug text-text-primary">{userName}</p>
          <p class="text-xs leading-snug text-text-muted capitalize">{userRole}</p>
        </div>
        {#if avatarUrl}
          <img
            src={avatarUrl}
            alt={userName}
            class="h-8 w-8 rounded-full object-cover ring-1 ring-glass-border flex-shrink-0"
          />
        {/if}
      </button>
    {/snippet}
  </Popover.Trigger>

  <Popover.Content align="end" sideOffset={8} class="w-60 p-0 overflow-hidden">
    <!-- Identity header -->
    <div class="px-4 py-3.5 border-b border-[var(--glass-separator)]">
      <p class="text-sm font-semibold leading-snug text-text-primary">{userName}</p>
      <p class="text-xs leading-snug text-text-muted capitalize mt-0.5">{userRole}</p>
    </div>

    <!-- Actions -->
    <div class="p-1.5">
      {#if isAdmin}
        <a
          href="/admin"
          onclick={() => { open = false; }}
          class="glass-dropdown-item flex items-center gap-2.5"
        >
          <Shield size={15} class="text-text-muted flex-shrink-0" />
          <span>Admin</span>
        </a>
      {/if}

      <button
        type="button"
        onclick={toggleTheme}
        class="glass-dropdown-item w-full flex items-center gap-2.5"
      >
        {#if currentTheme() === "dark"}
          <Sun size={15} class="text-text-muted flex-shrink-0" />
          <span>Light mode</span>
        {:else}
          <Moon size={15} class="text-text-muted flex-shrink-0" />
          <span>Dark mode</span>
        {/if}
      </button>
    </div>

    <!-- Destructive zone -->
    <div class="p-1.5 border-t border-[var(--glass-separator)]">
      <form method="POST" action="/logout">
        <button
          type="submit"
          class="glass-dropdown-item w-full flex items-center gap-2.5
                 text-text-muted hover:text-[#fca5a5] hover:bg-[rgba(239,68,68,0.10)]"
        >
          <LogOut size={15} class="flex-shrink-0" />
          <span>Sign out</span>
        </button>
      </form>
    </div>
  </Popover.Content>
</Popover.Root>
