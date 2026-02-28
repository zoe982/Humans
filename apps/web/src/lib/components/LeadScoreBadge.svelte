<script lang="ts">
  type Props = {
    score: number;
    band: string;
    size?: "sm" | "lg";
  };

  let { score, band, size = "sm" }: Props = $props();

  const colorClasses = $derived(
    band === "hot"
      ? "badge-red border-[var(--badge-red-text)]/30"
      : band === "warm"
        ? "badge-yellow border-[var(--badge-yellow-text)]/30"
        : "badge-blue border-[var(--badge-blue-text)]/30",
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
