import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/svelte";
import ConfettiOverlay from "./ConfettiOverlay.svelte";

describe("ConfettiOverlay", () => {
  it("renders nothing when trigger is false", () => {
    const { container } = render(ConfettiOverlay, { props: { trigger: false } });
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("renders a canvas when trigger is true", () => {
    // Mock canvas context since happy-dom doesn't support it
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    const { container } = render(ConfettiOverlay, { props: { trigger: true } });
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas?.classList.contains("fixed")).toBe(true);
    expect(canvas?.style.pointerEvents === "none" || canvas?.classList.contains("pointer-events-none")).toBe(true);
  });
});
