<script lang="ts">
  type Props = {
    columns?: number;
  };

  let { columns = 4 }: Props = $props();
</script>

<tr>
  {#each Array(columns) as _, i}
    <td>
      <div class="skeleton h-4 {i === 0 ? 'w-32' : 'w-20'}"></div>
    </td>
  {/each}
</tr>
