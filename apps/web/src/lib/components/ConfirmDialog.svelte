<script lang="ts">
  import { AlertTriangle } from "lucide-svelte";

  type Props = {
    open: boolean;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
  };

  let { open, message, confirmLabel = "Delete", onConfirm, onCancel }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onCancel();
  }
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
  <!-- Backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 bg-black/50"
      aria-label="Cancel"
      onclick={onCancel}
      tabindex="-1"
    ></button>

    <!-- Dialog -->
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      class="relative glass-card-strong p-6 max-w-sm w-full"
    >
      <div class="flex items-start gap-3">
        <div class="rounded-lg bg-danger p-2 text-red-400 shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h2 id="confirm-title" class="text-base font-semibold text-text-primary">Confirm Action</h2>
          <p id="confirm-message" class="mt-1 text-sm text-text-secondary">{message}</p>
        </div>
      </div>
      <div class="mt-5 flex justify-end gap-3">
        <button type="button" class="btn-ghost text-sm" onclick={onCancel}>
          Cancel
        </button>
        <button type="button" class="btn-danger text-sm" onclick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}
