<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    title: string;
    items: Array<{ id: string; [key: string]: unknown }>;
    emptyMessage?: string;
    addLabel?: string;
    deleteFormAction?: string;
    showAddForm?: boolean;
    itemRow: Snippet<[{ id: string; [key: string]: unknown }]>;
    addForm?: Snippet;
  };

  let {
    title,
    items,
    emptyMessage = "None yet.",
    addLabel = "Add",
    deleteFormAction,
    showAddForm = false,
    itemRow,
    addForm,
  }: Props = $props();

  let formOpen = $state(showAddForm);
</script>

<div class="glass-card p-5">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-text-primary">{title}</h2>
    {#if addForm}
      <button
        type="button"
        class="btn-ghost text-sm py-1 px-3"
        onclick={() => (formOpen = !formOpen)}
      >
        {formOpen ? "Cancel" : `+ ${addLabel}`}
      </button>
    {/if}
  </div>

  {#if formOpen && addForm}
    <div class="mb-4 p-4 rounded-xl bg-glass border border-glass-border">
      {@render addForm()}
    </div>
  {/if}

  {#if items.length === 0}
    <p class="text-text-muted text-sm">{emptyMessage}</p>
  {:else}
    <div class="space-y-2">
      {#each items as item (item.id)}
        <div class="flex items-center justify-between p-3 rounded-xl bg-glass hover:bg-glass-hover transition-colors">
          <div class="flex-1">
            {@render itemRow(item)}
          </div>
          {#if deleteFormAction}
            <form method="POST" action={deleteFormAction}>
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" class="text-red-400 hover:text-red-300 text-sm ml-3">
                Remove
              </button>
            </form>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
