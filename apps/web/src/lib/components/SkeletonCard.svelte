<script lang="ts">
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";

  type Props = {
    lines?: number;
  };

  let { lines = 3 }: Props = $props();
</script>

<div class="glass-card p-4 space-y-3">
  <Skeleton class="h-4 w-40" />
  {#each Array(lines - 1) as _}
    <Skeleton class="h-3 w-28" />
  {/each}
</div>
