<script lang="ts">
  type DataPoint = {
    date: string;
    count: number;
  };

  type Props = {
    data: DataPoint[];
  };

  let { data }: Props = $props();

  // SVG layout constants
  const VIEW_WIDTH = 800;
  const VIEW_HEIGHT = 200;
  const PADDING_TOP = 16;
  const PADDING_RIGHT = 16;
  const PADDING_BOTTOM = 40;
  const PADDING_LEFT = 40;

  const CHART_WIDTH = $derived(VIEW_WIDTH - PADDING_LEFT - PADDING_RIGHT);
  const CHART_HEIGHT = $derived(VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM);

  // Derived chart data
  const maxCount = $derived(data.length > 0 ? Math.max(...data.map((d) => d.count), 1) : 1);

  const barWidth = $derived(data.length > 0 ? CHART_WIDTH / data.length : 0);
  const barPadding = $derived(barWidth * 0.25);

  // Y-axis gridline values: 0, half, and max, rounded to nice numbers
  const yGridValues = $derived.by(() => {
    const step = Math.ceil(maxCount / 2);
    return [0, step, step * 2 > maxCount ? maxCount : step * 2];
  });

  function yToSvg(count: number): number {
    return PADDING_TOP + CHART_HEIGHT - (count / maxCount) * CHART_HEIGHT;
  }

  function xToSvg(index: number): number {
    return PADDING_LEFT + index * barWidth;
  }

  // Format a date string ("2024-02-01") as "Feb 1"
  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Hover state
  let hoveredIndex = $state<number | null>(null);

  const tooltip = $derived.by(() => {
    if (hoveredIndex === null || hoveredIndex >= data.length) return null;
    const point = data[hoveredIndex];
    if (!point) return null;
    const barX = xToSvg(hoveredIndex);
    const barH = (point.count / maxCount) * CHART_HEIGHT;
    const barY = PADDING_TOP + CHART_HEIGHT - barH;
    const bw = barWidth - barPadding * 2;

    // Center the tooltip over the bar; keep it within the SVG bounds
    const tipWidth = 90;
    const tipHeight = 34;
    const rawX = barX + barPadding + bw / 2 - tipWidth / 2;
    const tipX = Math.max(PADDING_LEFT, Math.min(rawX, VIEW_WIDTH - PADDING_RIGHT - tipWidth));
    const tipY = Math.max(PADDING_TOP, barY - tipHeight - 6);

    return {
      x: tipX,
      y: tipY,
      width: tipWidth,
      height: tipHeight,
      label: formatDateLabel(point.date),
      count: point.count,
    };
  });
</script>

<svg
  viewBox="0 0 {VIEW_WIDTH} {VIEW_HEIGHT}"
  preserveAspectRatio="xMidYMid meet"
  width="100%"
  aria-label="Daily activity counts over the last 30 days"
  role="img"
>
  <!-- Y-axis gridlines and labels -->
  {#each yGridValues as value}
    {@const y = yToSvg(value)}
    <line
      x1={PADDING_LEFT}
      y1={y}
      x2={VIEW_WIDTH - PADDING_RIGHT}
      y2={y}
      stroke="rgba(255,255,255,0.06)"
      stroke-width="1"
    />
    <text
      x={PADDING_LEFT - 6}
      y={y}
      text-anchor="end"
      dominant-baseline="middle"
      font-size="10"
      fill="rgba(255,255,255,0.5)"
    >
      {value}
    </text>
  {/each}

  <!-- Bars -->
  {#each data as point, i}
    {@const barH = Math.max((point.count / maxCount) * CHART_HEIGHT, point.count > 0 ? 2 : 0)}
    {@const barX = xToSvg(i) + barPadding}
    {@const barY = PADDING_TOP + CHART_HEIGHT - barH}
    {@const bw = barWidth - barPadding * 2}

    <rect
      x={barX}
      y={barY}
      width={bw}
      height={barH}
      rx="2"
      fill={hoveredIndex === i ? "rgba(6, 182, 212, 0.8)" : "rgba(6, 182, 212, 0.6)"}
      role="presentation"
      aria-hidden="true"
      onmouseenter={() => (hoveredIndex = i)}
      onmouseleave={() => (hoveredIndex = null)}
      style="cursor: pointer; transition: fill 0.1s ease;"
    />

    <!-- X-axis label every 5th bar (0-indexed: 0, 4, 9, 14, 19, 24, 29) -->
    {#if i % 5 === 0}
      <text
        x={barX + bw / 2}
        y={VIEW_HEIGHT - PADDING_BOTTOM + 14}
        text-anchor="middle"
        font-size="9"
        fill="rgba(255,255,255,0.5)"
      >
        {formatDateLabel(point.date)}
      </text>
    {/if}
  {/each}

  <!-- Transparent overlay rects for a larger hover hit area -->
  {#each data as hitPoint, i}
    {@const barX = xToSvg(i) + barPadding}
    {@const bw = barWidth - barPadding * 2}
    <rect
      x={barX}
      y={PADDING_TOP}
      width={bw}
      height={CHART_HEIGHT}
      fill="transparent"
      onmouseenter={() => (hoveredIndex = i)}
      onmouseleave={() => (hoveredIndex = null)}
      role="button"
      tabindex="0"
      aria-label="{formatDateLabel(hitPoint.date)}: {hitPoint.count} {hitPoint.count === 1 ? 'activity' : 'activities'}"
      onfocus={() => (hoveredIndex = i)}
      onblur={() => (hoveredIndex = null)}
    />
  {/each}

  <!-- Tooltip -->
  {#if tooltip !== null}
    <g role="tooltip" aria-live="polite">
      <!-- Background -->
      <rect
        x={tooltip.x}
        y={tooltip.y}
        width={tooltip.width}
        height={tooltip.height}
        rx="4"
        fill="rgba(15, 36, 64, 0.92)"
        stroke="rgba(255, 255, 255, 0.08)"
        stroke-width="1"
      />
      <!-- Date label -->
      <text
        x={tooltip.x + tooltip.width / 2}
        y={tooltip.y + 12}
        text-anchor="middle"
        font-size="9"
        fill="rgba(255,255,255,0.5)"
      >
        {tooltip.label}
      </text>
      <!-- Count -->
      <text
        x={tooltip.x + tooltip.width / 2}
        y={tooltip.y + 26}
        text-anchor="middle"
        font-size="12"
        font-weight="600"
        fill="rgb(6, 182, 212)"
      >
        {tooltip.count}
      </text>
    </g>
  {/if}

  <!-- X-axis baseline -->
  <line
    x1={PADDING_LEFT}
    y1={PADDING_TOP + CHART_HEIGHT}
    x2={VIEW_WIDTH - PADDING_RIGHT}
    y2={PADDING_TOP + CHART_HEIGHT}
    stroke="rgba(255,255,255,0.08)"
    stroke-width="1"
  />
</svg>
