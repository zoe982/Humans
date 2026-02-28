<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { getOnlineStatus, initOnlineMonitor, destroyOnlineMonitor } from "$lib/data/online-status";

  let online = $state(true);
  let interval: ReturnType<typeof setInterval> | undefined;

  onMount(() => {
    initOnlineMonitor();
    online = getOnlineStatus();
    // Poll status since getOnlineStatus is not reactive
    interval = setInterval(() => {
      online = getOnlineStatus();
    }, 1000);
  });

  onDestroy(() => {
    destroyOnlineMonitor();
    if (interval) clearInterval(interval);
  });
</script>

{#if !online}
  <div role="status" class="bg-[var(--warning-text)]/90 text-white text-center text-sm py-2 px-4">
    You're offline. Showing cached data.
  </div>
{/if}
