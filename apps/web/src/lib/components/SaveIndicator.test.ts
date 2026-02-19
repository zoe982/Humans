import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import SaveIndicator from "./SaveIndicator.svelte";

describe("SaveIndicator", () => {
  it("shows nothing when status is idle", () => {
    const { container } = render(SaveIndicator, { props: { status: "idle" } });
    expect(container.textContent?.trim()).toBe("");
  });

  it("shows Saving... when status is saving", () => {
    render(SaveIndicator, { props: { status: "saving" } });
    expect(screen.getByText("Saving...")).toBeDefined();
  });

  it("shows Saved when status is saved", () => {
    render(SaveIndicator, { props: { status: "saved" } });
    expect(screen.getByText("Saved")).toBeDefined();
  });

  it("shows Save failed when status is error", () => {
    render(SaveIndicator, { props: { status: "error" } });
    expect(screen.getByText("Save failed")).toBeDefined();
  });
});
