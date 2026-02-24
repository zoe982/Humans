<script lang="ts">
  import { updated } from "$app/stores";
  import { RefreshCw } from "lucide-svelte";
</script>

{#if $updated}
  <div role="alert" class="fixed bottom-4 left-4 z-50 rounded-xl p-4 shadow-xl flex items-center gap-3" style="background: var(--color-surface-overlay); border: 1px solid var(--color-accent);">
    <RefreshCw size={18} class="text-accent shrink-0" />
    <span class="text-sm text-text-primary">A new version is available</span>
    <button
      type="button"
      onclick={() => location.reload()}
      class="text-sm font-medium text-accent hover:text-[var(--link-hover)] whitespace-nowrap"
    >
      Refresh
    </button>
  </div>
{/if}
