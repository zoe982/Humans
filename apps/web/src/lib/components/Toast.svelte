<script lang="ts">
  import { X } from "lucide-svelte";
  import { fly, fade } from "svelte/transition";

  type Props = {
    message: string;
    onUndo?: () => void;
    onDismiss: () => void;
    durationMs?: number;
  };

  let { message, onUndo, onDismiss, durationMs = 8000 }: Props = $props();

  let timer: ReturnType<typeof setTimeout> | null = null;

  function startTimer() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => onDismiss(), durationMs);
  }

  function handleUndo() {
    if (timer) clearTimeout(timer);
    onUndo?.();
    onDismiss();
  }

  startTimer();
</script>

<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="fixed bottom-6 right-6 z-50 glass-card-strong p-4 shadow-xl max-w-sm"
  in:fly={{ y: 20, duration: 250 }}
  out:fade={{ duration: 200 }}
>
  <div class="flex items-center gap-3">
    <p class="text-sm text-text-primary flex-1">{message}</p>
    {#if onUndo}
      <button
        type="button"
        onclick={handleUndo}
        class="text-sm font-medium text-accent hover:text-cyan-300 whitespace-nowrap"
      >
        Undo
      </button>
    {/if}
    <button
      type="button"
      onclick={onDismiss}
      aria-label="Dismiss"
      class="text-text-muted hover:text-text-secondary text-sm"
    >
      <X size={16} aria-hidden="true" />
    </button>
  </div>
</div>
