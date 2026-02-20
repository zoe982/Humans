<script lang="ts">
  type Props = {
    lines?: number;
  };

  let { lines = 3 }: Props = $props();
</script>

<div class="glass-card p-4 space-y-3">
  <div class="skeleton h-4 w-40"></div>
  {#each Array(lines - 1) as _}
    <div class="skeleton h-3 w-28"></div>
  {/each}
</div>
