<script lang="ts">
  type Props = {
    status: string;
    colorMap: Record<string, string>;
  };

  let { status, colorMap }: Props = $props();

  let classes = $derived(colorMap[status] ?? "bg-glass text-text-secondary");
</script>

<span class="glass-badge {classes}">{status}</span>
