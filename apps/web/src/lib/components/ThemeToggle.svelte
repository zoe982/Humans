<script lang="ts">
  import { Sun, Moon } from "lucide-svelte";
  import { toggleTheme, currentTheme } from "$lib/stores/theme.svelte";
</script>

<button
  type="button"
  onclick={toggleTheme}
  class="rounded-lg px-2 py-2 text-text-muted hover:bg-glass-hover hover:text-text-primary transition-colors"
  aria-label="Toggle {currentTheme() === 'dark' ? 'light' : 'dark'} mode"
>
  {#if currentTheme() === "dark"}
    <Sun size={20} />
  {:else}
    <Moon size={20} />
  {/if}
</button>
