<script lang="ts">
  type Props = {
    score: number;
    band: string;
    size?: "sm" | "lg";
  };

  let { score, band, size = "sm" }: Props = $props();

  const colorClasses = $derived(
    band === "hot"
      ? "bg-red-500/20 text-red-400 border-red-500/30"
      : band === "warm"
        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        : "bg-blue-500/20 text-blue-400 border-blue-500/30",
  );

  const sizeClasses = $derived(
    size === "lg"
      ? "px-3 py-1.5 text-base font-bold"
      : "px-2 py-0.5 text-xs font-medium",
  );
</script>

<span class="glass-badge inline-flex items-center gap-1 rounded-full border {colorClasses} {sizeClasses}">
  {score}
  <span class="uppercase">{band}</span>
</span>
