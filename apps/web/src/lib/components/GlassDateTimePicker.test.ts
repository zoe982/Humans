import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";

// Mock the Calendar component — bits-ui Calendar uses <thead {...spread}>
// which triggers element.getAttribute in compiled Svelte 5 output, and
// happy-dom's table section elements don't support it correctly.
// We replace Calendar with a lightweight stub that renders clickable day
// buttons and calls onValueChange with a CalendarDate.
vi.mock("$lib/components/ui/calendar", async () => {
  const mod = await import("../../../test/mocks/calendar-stub.svelte");
  return { Calendar: mod.default };
});

import GlassDateTimePicker from "./GlassDateTimePicker.svelte";

describe("GlassDateTimePicker", () => {
  it("renders a hidden input with the given name", () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at" },
    });
    const hidden = container.querySelector('input[type="hidden"][name="scheduled_at"]');
    expect(hidden).not.toBeNull();
  });

  it("renders a hidden input with the given id when provided", () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at", id: "my-picker" },
    });
    const hidden = container.querySelector('input[type="hidden"]');
    if (!(hidden instanceof HTMLInputElement)) throw new Error("expected hidden input");
    expect(hidden.id).toBe("my-picker");
  });

  it("renders the placeholder text when no value is provided", () => {
    render(GlassDateTimePicker, { props: { name: "scheduled_at" } });
    expect(screen.getByText("Pick date & time...")).toBeDefined();
  });

  it("hidden input has empty value when no value prop is provided", () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at" },
    });
    const hidden = container.querySelector('input[type="hidden"]');
    if (!(hidden instanceof HTMLInputElement)) throw new Error("expected hidden input");
    expect(hidden.value).toBe("");
  });

  it("parses initial value and sets hidden input correctly", () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at", value: "2025-06-15T14:30:00" },
    });
    const hidden = container.querySelector('input[type="hidden"]');
    if (!(hidden instanceof HTMLInputElement)) throw new Error("expected hidden input");
    expect(hidden.value).toBe("2025-06-15T14:30:00");
  });

  it("does not display placeholder text when a valid value is provided", () => {
    render(GlassDateTimePicker, {
      props: { name: "scheduled_at", value: "2025-06-15T14:30:00" },
    });
    expect(screen.queryByText("Pick date & time...")).toBeNull();
  });

  it("renders the popover trigger button", () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at" },
    });
    // Popover.Trigger renders as a button
    const trigger = container.querySelector("button");
    expect(trigger).not.toBeNull();
  });

  it("updates hidden input when value prop changes via rerender", async () => {
    const { container, rerender } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at", value: "2025-06-15T14:30:00" },
    });
    let hidden = container.querySelector('input[type="hidden"]');
    if (!(hidden instanceof HTMLInputElement)) throw new Error("expected hidden input");
    expect(hidden.value).toBe("2025-06-15T14:30:00");

    await rerender({ name: "scheduled_at", value: "2025-09-01T09:00:00" });
    hidden = container.querySelector('input[type="hidden"]');
    if (!(hidden instanceof HTMLInputElement)) throw new Error("expected hidden input");
    expect(hidden.value).toBe("2025-09-01T09:00:00");
  });

  // --- Interactive tests ---

  it("opens popover when trigger button is clicked", async () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at" },
    });
    const trigger = container.querySelector("button");
    if (trigger === null) throw new Error("expected trigger button");
    expect(trigger.getAttribute("data-state")).toBe("closed");

    await fireEvent.click(trigger);

    await waitFor(() => {
      expect(trigger.getAttribute("data-state")).toBe("open");
    });
  });

  it("shows calendar content after clicking trigger", async () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at" },
    });
    const trigger = container.querySelector("button");
    if (trigger === null) throw new Error("expected trigger button");

    await fireEvent.click(trigger);

    await waitFor(() => {
      const calendar = document.querySelector("[data-mock-calendar]");
      expect(calendar).not.toBeNull();
    });
  });

  it("calls onchange with ISO datetime string when a date is selected", async () => {
    const onchange = vi.fn();
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at", onchange },
    });
    const trigger = container.querySelector("button");
    if (trigger === null) throw new Error("expected trigger button");

    await fireEvent.click(trigger);

    await waitFor(() => {
      expect(document.querySelector("[data-mock-calendar]")).not.toBeNull();
    });

    const dayButton = document.querySelector("[data-mock-calendar] button[data-day='15']");
    if (!(dayButton instanceof HTMLElement)) throw new Error("expected day button");
    await fireEvent.click(dayButton);

    await waitFor(() => {
      expect(onchange).toHaveBeenCalledOnce();
    });
    // Default hour=12, minute=0
    expect(onchange.mock.calls[0][0]).toBe("2026-02-15T12:00:00");
  });

  it("updates hidden input value after date selection", async () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at" },
    });
    const trigger = container.querySelector("button");
    if (trigger === null) throw new Error("expected trigger button");

    await fireEvent.click(trigger);

    await waitFor(() => {
      expect(document.querySelector("[data-mock-calendar]")).not.toBeNull();
    });

    const dayButton = document.querySelector("[data-mock-calendar] button[data-day='15']");
    if (!(dayButton instanceof HTMLElement)) throw new Error("expected day button");
    await fireEvent.click(dayButton);

    await waitFor(() => {
      const hidden = container.querySelector('input[type="hidden"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("expected hidden input");
      expect(hidden.value).toBe("2026-02-15T12:00:00");
    });
  });

  it("shows time inputs after opening popover", async () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at" },
    });
    const trigger = container.querySelector("button");
    if (trigger === null) throw new Error("expected trigger button");

    await fireEvent.click(trigger);

    await waitFor(() => {
      const timeInputs = document.querySelectorAll('input[type="number"]');
      expect(timeInputs.length).toBeGreaterThanOrEqual(2);
    });
  });
});
