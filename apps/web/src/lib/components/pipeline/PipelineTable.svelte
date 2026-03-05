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
    header: Snippet;
    row: Snippet<[PipelineItem]>;
  }

  const { groups, header, row }: Props = $props();
</script>

<div class="glass-card overflow-hidden">
  <table class="w-full border-collapse">
    <thead class="glass-thead">
      <tr>
        {@render header()}
      </tr>
    </thead>
    <tbody>
      {#each groups as group, gi (gi)}
        <tr data-stage={group.stage}>
          <td colspan="99" class="px-4 pt-5 pb-2">
            <div class="flex items-center gap-2">
              <span class="glass-badge {group.color} text-xs">{group.label}</span>
              <span class="text-xs text-text-muted">{group.items.length}</span>
            </div>
          </td>
        </tr>
        {#each group.items as item, ii (ii)}
          <tr class="glass-row-hover">
            {@render row(item)}
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
</div>
