import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import ActivityChart from "./ActivityChart.svelte";

function makeData(days: number, count: number = 3) {
  return Array.from({ length: days }, (_, i) => ({
    date: `2024-02-${String(i + 1).padStart(2, "0")}`,
    count,
  }));
}

describe("ActivityChart", () => {
  // --- Rendering ---

  it("renders an SVG element", () => {
    const { container } = render(ActivityChart, { props: { data: makeData(30) } });
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("sets the correct viewBox on the SVG", () => {
    const { container } = render(ActivityChart, { props: { data: makeData(30) } });
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 800 200");
  });

  it("sets preserveAspectRatio on the SVG", () => {
    const { container } = render(ActivityChart, { props: { data: makeData(30) } });
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
  });

  it("sets width=100% so the chart is responsive", () => {
    const { container } = render(ActivityChart, { props: { data: makeData(30) } });
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("100%");
  });

  it("has an accessible role and aria-label on the SVG", () => {
    render(ActivityChart, { props: { data: makeData(30) } });
    const svg = screen.getByRole("img");
    expect(svg).not.toBeNull();
    expect(svg.getAttribute("aria-label")).toContain("activity");
  });

  // --- Bars ---

  it("renders one bar rect per data point", () => {
    const data = makeData(30);
    const { container } = render(ActivityChart, { props: { data } });
    // presentation rects (bars) have role="presentation"
    const bars = container.querySelectorAll('rect[role="presentation"]');
    expect(bars.length).toBe(30);
  });

  it("renders bars with rx=2 for rounded corners", () => {
    const data = makeData(5);
    const { container } = render(ActivityChart, { props: { data } });
    const bars = container.querySelectorAll('rect[role="presentation"]');
    bars.forEach((bar) => {
      expect(bar.getAttribute("rx")).toBe("2");
    });
  });

  it("renders bars with the accent fill color", () => {
    const data = makeData(5);
    const { container } = render(ActivityChart, { props: { data } });
    const bars = container.querySelectorAll('rect[role="presentation"]');
    bars.forEach((bar) => {
      expect(bar.getAttribute("fill")).toContain("rgba(6, 182, 212");
    });
  });

  it("renders no bars when data is empty", () => {
    const { container } = render(ActivityChart, { props: { data: [] } });
    const bars = container.querySelectorAll('rect[role="presentation"]');
    expect(bars.length).toBe(0);
  });

  // --- Empty / Zero counts ---

  it("renders bars with zero height for zero-count entries", () => {
    const data = [{ date: "2024-02-01", count: 0 }];
    const { container } = render(ActivityChart, { props: { data } });
    const bars = container.querySelectorAll('rect[role="presentation"]');
    // height must be 0 or very small for a zero-count bar
    bars.forEach((bar) => {
      expect(Number(bar.getAttribute("height"))).toBe(0);
    });
  });

  it("handles a single data point without throwing", () => {
    const { container } = render(ActivityChart, {
      props: { data: [{ date: "2024-02-01", count: 5 }] },
    });
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("handles all-zero counts without throwing", () => {
    const data = makeData(30, 0);
    const { container } = render(ActivityChart, { props: { data } });
    expect(container.querySelector("svg")).not.toBeNull();
  });

  // --- X-axis labels ---

  it("renders an x-axis label for every 5th bar (0-indexed: 0, 5, 10, ...)", () => {
    const data = makeData(30);
    const { container } = render(ActivityChart, { props: { data } });
    // All text nodes except y-axis numbers and tooltip text:
    // x-axis labels appear at positions 0, 5, 10, 15, 20, 25 → 6 labels for 30 items
    // The y-axis also renders 3 labels. We'll count labels containing "Feb".
    const allText = Array.from(container.querySelectorAll("text"));
    const xLabels = allText.filter((t) => t.textContent?.includes("Feb") && Number(t.getAttribute("font-size")) === 9);
    // 30 items / 5 = 6 labels
    expect(xLabels.length).toBe(6);
  });

  it("formats x-axis labels as 'Mon D' (e.g. 'Feb 1')", () => {
    const data = [{ date: "2024-02-01", count: 1 }];
    const { container } = render(ActivityChart, { props: { data } });
    const allText = Array.from(container.querySelectorAll("text"));
    const xLabel = allText.find((t) => t.textContent?.trim() === "Feb 1" && Number(t.getAttribute("font-size")) === 9);
    expect(xLabel).not.toBeUndefined();
  });

  // --- Y-axis gridlines and labels ---

  it("renders horizontal gridlines", () => {
    const { container } = render(ActivityChart, { props: { data: makeData(30) } });
    // Gridlines are <line> elements with the faint stroke color
    const lines = Array.from(container.querySelectorAll("line")).filter(
      (l) => l.getAttribute("stroke") === "rgba(255,255,255,0.06)"
    );
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it("renders y-axis text labels", () => {
    const { container } = render(ActivityChart, { props: { data: makeData(30, 10) } });
    const yLabels = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.getAttribute("text-anchor") === "end" && t.getAttribute("fill") === "rgba(255,255,255,0.5)"
    );
    // At least "0" and the max value
    expect(yLabels.length).toBeGreaterThanOrEqual(2);
  });

  it("renders y-axis label '0' at the bottom", () => {
    const { container } = render(ActivityChart, { props: { data: makeData(5, 4) } });
    const yLabels = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.getAttribute("text-anchor") === "end"
    );
    const zeroLabel = yLabels.find((t) => t.textContent?.trim() === "0");
    expect(zeroLabel).not.toBeUndefined();
  });

  // --- Baseline ---

  it("renders a baseline line at the bottom of the chart area", () => {
    const { container } = render(ActivityChart, { props: { data: makeData(30) } });
    const lines = Array.from(container.querySelectorAll("line")).filter(
      (l) => l.getAttribute("stroke") === "rgba(255,255,255,0.08)"
    );
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  // --- Hover overlay buttons (keyboard accessibility) ---

  it("renders an accessible button overlay for each bar", () => {
    const data = makeData(30);
    const { container } = render(ActivityChart, { props: { data } });
    const overlays = container.querySelectorAll('rect[role="button"]');
    expect(overlays.length).toBe(30);
  });

  it("each overlay has a descriptive aria-label", () => {
    const data = [{ date: "2024-02-01", count: 3 }];
    const { container } = render(ActivityChart, { props: { data } });
    const overlay = container.querySelector('rect[role="button"]');
    expect(overlay?.getAttribute("aria-label")).toContain("3");
    expect(overlay?.getAttribute("aria-label")).toContain("activities");
  });

  it("each overlay is keyboard-focusable (tabindex=0)", () => {
    const data = makeData(5);
    const { container } = render(ActivityChart, { props: { data } });
    const overlays = container.querySelectorAll('rect[role="button"]');
    overlays.forEach((o) => {
      expect(o.getAttribute("tabindex")).toBe("0");
    });
  });

  it("uses singular 'activity' in aria-label when count is 1", () => {
    const data = [{ date: "2024-02-01", count: 1 }];
    const { container } = render(ActivityChart, { props: { data } });
    const overlay = container.querySelector('rect[role="button"]');
    expect(overlay?.getAttribute("aria-label")).toContain("1 activity");
  });

  it("uses plural 'activities' in aria-label when count is 0", () => {
    const data = [{ date: "2024-02-01", count: 0 }];
    const { container } = render(ActivityChart, { props: { data } });
    const overlay = container.querySelector('rect[role="button"]');
    expect(overlay?.getAttribute("aria-label")).toContain("0 activities");
  });

  // --- Hover / tooltip ---

  it("does not render a tooltip initially", () => {
    const { container } = render(ActivityChart, { props: { data: makeData(10) } });
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });

  it("shows a tooltip on mouseenter", async () => {
    const data = makeData(5, 7);
    const { container } = render(ActivityChart, { props: { data } });
    const overlay = container.querySelector('rect[role="button"]') as SVGElement;
    await fireEvent.mouseEnter(overlay);
    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
  });

  it("tooltip contains the count value", async () => {
    const data = [{ date: "2024-02-01", count: 42 }];
    const { container } = render(ActivityChart, { props: { data } });
    const overlay = container.querySelector('rect[role="button"]') as SVGElement;
    await fireEvent.mouseEnter(overlay);
    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip?.textContent).toContain("42");
  });

  it("tooltip contains the formatted date", async () => {
    const data = [{ date: "2024-02-01", count: 1 }];
    const { container } = render(ActivityChart, { props: { data } });
    const overlay = container.querySelector('rect[role="button"]') as SVGElement;
    await fireEvent.mouseEnter(overlay);
    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip?.textContent).toContain("Feb 1");
  });

  it("hides the tooltip on mouseleave", async () => {
    const data = makeData(5, 7);
    const { container } = render(ActivityChart, { props: { data } });
    const overlay = container.querySelector('rect[role="button"]') as SVGElement;
    await fireEvent.mouseEnter(overlay);
    expect(container.querySelector('[role="tooltip"]')).not.toBeNull();
    await fireEvent.mouseLeave(overlay);
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });

  it("shows tooltip on focus (keyboard navigation)", async () => {
    const data = makeData(5, 3);
    const { container } = render(ActivityChart, { props: { data } });
    const overlay = container.querySelector('rect[role="button"]') as SVGElement;
    await fireEvent.focus(overlay);
    expect(container.querySelector('[role="tooltip"]')).not.toBeNull();
  });

  it("hides tooltip on blur (keyboard navigation)", async () => {
    const data = makeData(5, 3);
    const { container } = render(ActivityChart, { props: { data } });
    const overlay = container.querySelector('rect[role="button"]') as SVGElement;
    await fireEvent.focus(overlay);
    await fireEvent.blur(overlay);
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });

  // --- Hover bar color change ---

  it("changes the hovered bar fill to the brighter accent color", async () => {
    const data = makeData(5, 4);
    const { container } = render(ActivityChart, { props: { data } });
    const bars = container.querySelectorAll('rect[role="presentation"]');
    const overlays = container.querySelectorAll('rect[role="button"]');
    const firstOverlay = overlays[0] as SVGElement;
    await fireEvent.mouseEnter(firstOverlay);
    // First bar should now have the hover fill
    expect(bars[0].getAttribute("fill")).toBe("rgba(6, 182, 212, 0.8)");
    // Other bars remain at normal fill
    expect(bars[1].getAttribute("fill")).toBe("rgba(6, 182, 212, 0.6)");
  });

  it("restores normal bar fill after mouseleave", async () => {
    const data = makeData(5, 4);
    const { container } = render(ActivityChart, { props: { data } });
    const bars = container.querySelectorAll('rect[role="presentation"]');
    const overlays = container.querySelectorAll('rect[role="button"]');
    const firstOverlay = overlays[0] as SVGElement;
    await fireEvent.mouseEnter(firstOverlay);
    await fireEvent.mouseLeave(firstOverlay);
    expect(bars[0].getAttribute("fill")).toBe("rgba(6, 182, 212, 0.6)");
  });

  // --- Large counts (boundary) ---

  it("renders correctly when all counts are the same (flat chart)", () => {
    const data = makeData(30, 100);
    const { container } = render(ActivityChart, { props: { data } });
    const bars = container.querySelectorAll('rect[role="presentation"]');
    expect(bars.length).toBe(30);
    // All bars should have the same height
    const heights = Array.from(bars).map((b) => b.getAttribute("height"));
    const unique = new Set(heights);
    expect(unique.size).toBe(1);
  });

  it("renders correctly with a single very high spike", () => {
    const data = [
      { date: "2024-02-01", count: 1 },
      { date: "2024-02-02", count: 999 },
      { date: "2024-02-03", count: 1 },
    ];
    const { container } = render(ActivityChart, { props: { data } });
    const bars = container.querySelectorAll('rect[role="presentation"]');
    expect(bars.length).toBe(3);
    // The spike bar should be taller than the others
    const heights = Array.from(bars).map((b) => Number(b.getAttribute("height")));
    expect(heights[1]).toBeGreaterThan(heights[0]);
    expect(heights[1]).toBeGreaterThan(heights[2]);
  });
});
