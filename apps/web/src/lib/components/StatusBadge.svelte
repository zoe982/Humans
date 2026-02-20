<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";

  type Props = {
    status: string;
    colorMap: Record<string, string>;
  };

  let { status, colorMap }: Props = $props();

  let classes = $derived(colorMap[status] ?? "bg-glass text-text-secondary");
</script>

<Badge class={classes}>{status}</Badge>
