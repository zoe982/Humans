<script lang="ts">
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

<div class="fixed bottom-6 right-6 z-50 glass-card-strong p-4 shadow-xl max-w-sm animate-slide-up">
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
      class="text-text-muted hover:text-text-secondary text-sm"
    >
      &times;
    </button>
  </div>
</div>

<style>
  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(1rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-slide-up {
    animation: slide-up 0.2s ease-out;
  }
</style>
