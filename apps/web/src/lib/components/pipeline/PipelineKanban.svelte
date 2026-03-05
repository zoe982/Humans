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

<div class="pipeline-kanban">
  {#each groups as group, gi (gi)}
    <div class="glass-card pipeline-column" data-stage={group.stage}>
      <div class="pipeline-column-header">
        <span style="background-color: {group.color}; display: inline-block; width: 10px; height: 10px; border-radius: 50%;"></span>
        <span class="pipeline-column-label">{group.label}</span>
        <span class="glass-badge">{group.items.length}</span>
      </div>
      <div class="pipeline-column-body">
        {#if group.items.length === 0}
          <div data-empty class="pipeline-empty">No items</div>
        {/if}
        {#each group.items as item, ii (ii)}
          {@render card(item)}
        {/each}
      </div>
    </div>
  {/each}
</div>
