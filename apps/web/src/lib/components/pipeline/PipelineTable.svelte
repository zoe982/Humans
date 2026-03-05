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

<table>
  <thead>
    <tr>
      {@render header()}
    </tr>
  </thead>
  <tbody>
    {#each groups as group, gi (gi)}
      <tr data-stage={group.stage}>
        <td>
          <span style="background-color: {group.color}; display: inline-block; width: 10px; height: 10px; border-radius: 50%;"></span>
          <span>{group.label}</span>
          <span class="glass-badge">{group.items.length}</span>
        </td>
      </tr>
      {#each group.items as item, ii (ii)}
        <tr>
          {@render row(item)}
        </tr>
      {/each}
    {/each}
  </tbody>
</table>
