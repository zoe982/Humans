<script lang="ts">
  import type { Snippet } from "svelte";
  import { slide } from "svelte/transition";
  import { Plus } from "lucide-svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";

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

<Card.Root class="p-5">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-text-primary">{title}</h2>
    {#if addForm}
      <Button
        variant="ghost"
        size="sm"
        type="button"
        aria-expanded={formOpen}
        onclick={() => (formOpen = !formOpen)}
      >
        {#if formOpen}Cancel{:else}<Plus size={14} class="inline -mt-0.5" /> {addLabel}{/if}
      </Button>
    {/if}
  </div>

  {#if formOpen && addForm}
    <div transition:slide={{ duration: 200 }} class="mb-4 p-4 rounded-xl bg-glass border border-glass-border">
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
              <Button variant="link" size="sm" type="submit" class="text-red-400 hover:text-red-300 ml-3">
                Remove
              </Button>
            </form>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</Card.Root>
