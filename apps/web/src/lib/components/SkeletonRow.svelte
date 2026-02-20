<script lang="ts">
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";

  type Props = {
    columns?: number;
  };

  let { columns = 4 }: Props = $props();
</script>

<tr>
  {#each Array(columns) as _, i}
    <td>
      <Skeleton class="h-4 {i === 0 ? 'w-32' : 'w-20'}" />
    </td>
  {/each}
</tr>
