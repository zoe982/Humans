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

  // Compute cumulative data
  const cumulativeData = $derived.by(() => {
    let running = 0;
    return data.map((d) => {
      running += d.count;
      return { date: d.date, count: d.count, cumulative: running };
    });
  });

  const maxCumulative = $derived(
    // eslint-disable-next-line security/detect-object-injection
    cumulativeData.length > 0 ? Math.max(cumulativeData[cumulativeData.length - 1]!.cumulative, 1) : 1,
  );

  // Y-axis gridline values: 0, half, and max, rounded to nice numbers
  const yGridValues = $derived.by(() => {
    const step = Math.ceil(maxCumulative / 2);
    return [0, step, step * 2 > maxCumulative ? maxCumulative : step * 2];
  });

  function yToSvg(value: number): number {
    return PADDING_TOP + CHART_HEIGHT - (value / maxCumulative) * CHART_HEIGHT;
  }

  function xToSvg(index: number): number {
    if (cumulativeData.length <= 1) return PADDING_LEFT;
    return PADDING_LEFT + (index / (cumulativeData.length - 1)) * CHART_WIDTH;
  }

  // Build the line path and area path
  const linePath = $derived.by(() => {
    if (cumulativeData.length === 0) return "";
    return cumulativeData
      .map((d, i) => `${i === 0 ? "M" : "L"}${xToSvg(i)},${yToSvg(d.cumulative)}`)
      .join(" ");
  });

  const areaPath = $derived.by(() => {
    if (cumulativeData.length === 0) return "";
    const baseline = PADDING_TOP + CHART_HEIGHT;
    const first = `M${xToSvg(0)},${baseline}`;
    const lineUp = cumulativeData.map((d, i) => `L${xToSvg(i)},${yToSvg(d.cumulative)}`).join(" ");
    const close = `L${xToSvg(cumulativeData.length - 1)},${baseline} Z`;
    return `${first} ${lineUp} ${close}`;
  });

  // Format a date string ("2024-02-01") as "Feb 1"
  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Hover state
  let hoveredIndex = $state<number | null>(null);

  // Segment width for hover hit areas
  const segmentWidth = $derived(
    cumulativeData.length > 1 ? CHART_WIDTH / (cumulativeData.length - 1) : CHART_WIDTH,
  );

  const tooltip = $derived.by(() => {
    if (hoveredIndex === null || hoveredIndex >= cumulativeData.length) return null;
    const point = cumulativeData[hoveredIndex];
    if (!point) return null;
    const px = xToSvg(hoveredIndex);
    const py = yToSvg(point.cumulative);

    const tipWidth = 110;
    const tipHeight = 46;
    const rawX = px - tipWidth / 2;
    const tipX = Math.max(PADDING_LEFT, Math.min(rawX, VIEW_WIDTH - PADDING_RIGHT - tipWidth));
    const tipY = Math.max(PADDING_TOP, py - tipHeight - 10);

    return {
      x: tipX,
      y: tipY,
      width: tipWidth,
      height: tipHeight,
      label: formatDateLabel(point.date),
      daily: point.count,
      cumulative: point.cumulative,
    };
  });
</script>

<svg
  viewBox="0 0 {VIEW_WIDTH} {VIEW_HEIGHT}"
  preserveAspectRatio="xMidYMid meet"
  width="100%"
  aria-label="Cumulative activity counts over the last 30 days"
  role="img"
>
  <!-- Y-axis gridlines and labels -->
  {#each yGridValues as value (value)}
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

  <!-- Filled area under the line -->
  {#if areaPath}
    <path
      d={areaPath}
      fill="rgba(6, 182, 212, 0.15)"
      data-testid="area"
    />
  {/if}

  <!-- Line -->
  {#if linePath}
    <path
      d={linePath}
      fill="none"
      stroke="rgba(6, 182, 212, 0.8)"
      stroke-width="2"
      stroke-linejoin="round"
      stroke-linecap="round"
      data-testid="line"
    />
  {/if}

  <!-- Data point dots -->
  {#each cumulativeData as point, i (point.date)}
    <circle
      cx={xToSvg(i)}
      cy={yToSvg(point.cumulative)}
      r={hoveredIndex === i ? 5 : 3}
      fill={hoveredIndex === i ? "rgb(6, 182, 212)" : "rgba(6, 182, 212, 0.8)"}
      stroke={hoveredIndex === i ? "rgba(6, 182, 212, 0.3)" : "none"}
      stroke-width={hoveredIndex === i ? 4 : 0}
      role="presentation"
      aria-hidden="true"
      style="transition: r 0.1s ease, fill 0.1s ease;"
    />
  {/each}

  <!-- X-axis labels every 5th point -->
  {#each cumulativeData as point, i (point.date)}
    {#if i % 5 === 0}
      <text
        x={xToSvg(i)}
        y={VIEW_HEIGHT - PADDING_BOTTOM + 14}
        text-anchor="middle"
        font-size="9"
        fill="rgba(255,255,255,0.5)"
      >
        {formatDateLabel(point.date)}
      </text>
    {/if}
  {/each}

  <!-- Transparent overlay rects for hover hit areas -->
  {#each cumulativeData as point, i (point.date)}
    {@const hitX = cumulativeData.length <= 1
      ? PADDING_LEFT
      : xToSvg(i) - segmentWidth / 2}
    {@const hitW = cumulativeData.length <= 1
      ? CHART_WIDTH
      : segmentWidth}
    <rect
      x={Math.max(PADDING_LEFT, hitX)}
      y={PADDING_TOP}
      width={Math.min(hitW, VIEW_WIDTH - PADDING_RIGHT - Math.max(PADDING_LEFT, hitX))}
      height={CHART_HEIGHT}
      fill="transparent"
      onmouseenter={() => (hoveredIndex = i)}
      onmouseleave={() => (hoveredIndex = null)}
      role="button"
      tabindex="0"
      aria-label="{formatDateLabel(point.date)}: {point.cumulative} total ({point.count} {point.count === 1 ? 'activity' : 'activities'})"
      onfocus={() => (hoveredIndex = i)}
      onblur={() => (hoveredIndex = null)}
    />
  {/each}

  <!-- Tooltip -->
  {#if tooltip !== null}
    <g role="tooltip" aria-live="polite">
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
      <text
        x={tooltip.x + tooltip.width / 2}
        y={tooltip.y + 12}
        text-anchor="middle"
        font-size="9"
        fill="rgba(255,255,255,0.5)"
      >
        {tooltip.label}
      </text>
      <text
        x={tooltip.x + tooltip.width / 2}
        y={tooltip.y + 26}
        text-anchor="middle"
        font-size="12"
        font-weight="600"
        fill="rgb(6, 182, 212)"
      >
        {tooltip.cumulative} total
      </text>
      <text
        x={tooltip.x + tooltip.width / 2}
        y={tooltip.y + 40}
        text-anchor="middle"
        font-size="9"
        fill="rgba(255,255,255,0.4)"
      >
        +{tooltip.daily} today
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
