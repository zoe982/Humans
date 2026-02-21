<script lang="ts">
  import type { SaveStatus } from "$lib/autosave";

  type Props = {
    status: SaveStatus;
  };

  let { status }: Props = $props();
</script>

<span aria-live="polite" aria-atomic="true">
  {#if status === "saving"}
    <span class="text-xs text-text-muted animate-pulse">Saving...</span>
  {:else if status === "saved"}
    <span class="text-xs text-[var(--badge-green-text)]">Saved</span>
  {:else if status === "error"}
    <span class="text-xs text-destructive-foreground">Save failed</span>
  {/if}
</span>
