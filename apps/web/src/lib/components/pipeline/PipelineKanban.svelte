<script lang="ts">
  import type { Snippet } from "svelte";

  interface PipelineItem {
    id: string;
    [key: string]: unknown;
  }

  interface PipelineGroup {
    stage: string;
    label: string;
    color: string;
    items: PipelineItem[];
  }

  interface Props {
    groups: PipelineGroup[];
    card: Snippet<[PipelineItem]>;
  }

  const { groups, card }: Props = $props();
</script>

<div class="flex gap-4 overflow-x-auto pb-4 items-start">
  {#each groups as group, gi (gi)}
    <div class="glass-card flex-none w-72 flex flex-col" data-stage={group.stage}>
      <div class="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-glass-border">
        <span class="glass-badge {group.color} text-xs">{group.label}</span>
        <span class="text-xs font-medium text-text-muted">{group.items.length}</span>
      </div>
      <div class="flex flex-col gap-2 p-3 min-h-[120px]">
        {#if group.items.length === 0}
          <div data-empty class="flex items-center justify-center py-6 text-xs text-text-muted italic">No items</div>
        {/if}
        {#each group.items as item, ii (ii)}
          {@render card(item)}
        {/each}
      </div>
    </div>
  {/each}
</div>
