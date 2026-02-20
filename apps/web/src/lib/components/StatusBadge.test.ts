import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import StatusBadge from "./StatusBadge.svelte";

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(StatusBadge, { props: { status: "active", colorMap: {} } });
    expect(screen.getByText("active")).toBeDefined();
  });

  it("applies color class from colorMap", () => {
    const colorMap = { active: "bg-green-500 text-white" };
    const { container } = render(StatusBadge, { props: { status: "active", colorMap } });
    const badge = container.querySelector("div.glass-badge");
    expect(badge?.className).toContain("bg-green-500");
  });

  it("applies fallback class for unknown status", () => {
    const { container } = render(StatusBadge, { props: { status: "unknown", colorMap: {} } });
    const badge = container.querySelector("div.glass-badge");
    expect(badge?.className).toContain("bg-glass");
  });
});
