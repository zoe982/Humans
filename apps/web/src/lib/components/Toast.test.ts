import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/svelte";
import Toast from "./Toast.svelte";

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the message", () => {
    const onDismiss = vi.fn();
    render(Toast, { props: { message: "Record saved", onDismiss } });
    expect(screen.getByText("Record saved")).toBeDefined();
  });

  it("renders dismiss button", () => {
    const onDismiss = vi.fn();
    const { container } = render(Toast, { props: { message: "Test", onDismiss } });
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Undo button when onUndo is provided", () => {
    const onDismiss = vi.fn();
    const onUndo = vi.fn();
    render(Toast, { props: { message: "Deleted", onDismiss, onUndo } });
    expect(screen.getByText("Undo")).toBeDefined();
  });

  it("does not show Undo button when onUndo is not provided", () => {
    const onDismiss = vi.fn();
    render(Toast, { props: { message: "Info", onDismiss } });
    expect(screen.queryByText("Undo")).toBeNull();
  });

  it("auto-dismisses after durationMs", () => {
    const onDismiss = vi.fn();
    render(Toast, { props: { message: "Test", onDismiss, durationMs: 3000 } });

    vi.advanceTimersByTime(2999);
    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
