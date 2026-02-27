<script lang="ts">
  import { Check, X, Pencil, Loader2 } from "lucide-svelte";

  type Props = {
    value: string | null;
    onSave: (newValue: string) => Promise<void>;
    placeholder?: string;
  };

  let { value, onSave, placeholder = "Add a note..." }: Props = $props();

  let editing = $state(false);
  let draft = $state("");
  let saving = $state(false);
  let error = $state<string | null>(null);

  function startEditing() {
    draft = value ?? "";
    editing = true;
    error = null;
  }

  function cancel() {
    editing = false;
    error = null;
  }

  async function save() {
    saving = true;
    error = null;
    try {
      await onSave(draft);
      editing = false;
    } catch (e) {
      error = e instanceof Error ? e.message : "Save failed";
    } finally {
      saving = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") cancel();
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      void save();
    }
  }
</script>

{#if editing}
  <div class="flex flex-col gap-1 min-w-[180px]">
    <textarea
      class="glass-input text-sm w-full px-2 py-1 resize-none"
      rows={2}
      bind:value={draft}
      onkeydown={handleKeydown}
      disabled={saving}
    ></textarea>
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="inline-flex items-center gap-0.5 text-xs text-accent hover:text-[var(--link-hover)] disabled:opacity-50"
        onclick={() => void save()}
        disabled={saving}
      >
        {#if saving}
          <Loader2 size={12} class="animate-spin" />
        {:else}
          <Check size={12} />
        {/if}
        Save
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-0.5 text-xs text-text-muted hover:text-text-primary"
        onclick={cancel}
        disabled={saving}
      >
        <X size={12} />
        Cancel
      </button>
    </div>
    {#if error}
      <p class="text-xs text-destructive-foreground">{error}</p>
    {/if}
  </div>
{:else}
  <button
    type="button"
    class="group inline-flex items-center gap-1 text-left max-w-xs cursor-pointer"
    onclick={startEditing}
    title="Click to edit"
  >
    <span class="truncate text-sm {value ? 'text-text-muted' : 'text-text-muted/50 italic'}">{value || placeholder}</span>
    <Pencil size={12} class="text-text-muted/40 group-hover:text-accent shrink-0 transition-colors" />
  </button>
{/if}
