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

import GlassDatePicker from "./GlassDatePicker.svelte";

describe("GlassDatePicker", () => {
  it("renders a hidden input with the given name", () => {
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date" },
    });
    const hidden = container.querySelector('input[type="hidden"][name="birth_date"]');
    expect(hidden).not.toBeNull();
  });

  it("hidden input has empty value when no value prop is provided", () => {
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date" },
    });
    const hidden = container.querySelector('input[type="hidden"]');
    if (!(hidden instanceof HTMLInputElement)) throw new Error("expected hidden input");
    expect(hidden.value).toBe("");
  });

  it("shows 'Pick date...' placeholder when no value is provided", () => {
    render(GlassDatePicker, { props: { name: "birth_date" } });
    expect(screen.getByText("Pick date...")).toBeDefined();
  });

  it("parses initial YYYY-MM-DD value and sets hidden input", () => {
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date", value: "2025-03-15" },
    });
    const hidden = container.querySelector('input[type="hidden"]');
    if (!(hidden instanceof HTMLInputElement)) throw new Error("expected hidden input");
    expect(hidden.value).toBe("2025-03-15");
  });

  it("does not show placeholder text when a valid value is provided", () => {
    render(GlassDatePicker, {
      props: { name: "birth_date", value: "2025-03-15" },
    });
    expect(screen.queryByText("Pick date...")).toBeNull();
  });

  it("renders the popover trigger button", () => {
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date" },
    });
    const trigger = container.querySelector("button");
    expect(trigger).not.toBeNull();
  });

  it("updates hidden input when value prop changes via rerender", async () => {
    const { container, rerender } = render(GlassDatePicker, {
      props: { name: "birth_date", value: "2025-03-15" },
    });
    let hidden = container.querySelector('input[type="hidden"]');
    if (!(hidden instanceof HTMLInputElement)) throw new Error("expected hidden input");
    expect(hidden.value).toBe("2025-03-15");

    await rerender({ name: "birth_date", value: "2026-11-30" });
    hidden = container.querySelector('input[type="hidden"]');
    if (!(hidden instanceof HTMLInputElement)) throw new Error("expected hidden input");
    expect(hidden.value).toBe("2026-11-30");
  });

  // --- Interactive tests ---

  it("opens popover when trigger button is clicked", async () => {
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date" },
    });
    const trigger = container.querySelector("button");
    if (!trigger) throw new Error("expected trigger button");
    expect(trigger.getAttribute("data-state")).toBe("closed");

    await fireEvent.click(trigger);

    await waitFor(() => {
      expect(trigger.getAttribute("data-state")).toBe("open");
    });
  });

  it("shows calendar content after clicking trigger", async () => {
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date" },
    });
    const trigger = container.querySelector("button");
    if (!trigger) throw new Error("expected trigger button");

    await fireEvent.click(trigger);

    await waitFor(() => {
      const calendar = document.querySelector("[data-mock-calendar]");
      expect(calendar).not.toBeNull();
    });
  });

  it("calls onchange with ISO string when a date is selected", async () => {
    const onchange = vi.fn();
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date", onchange },
    });
    const trigger = container.querySelector("button");
    if (!trigger) throw new Error("expected trigger button");

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
    expect(onchange.mock.calls[0][0]).toBe("2026-02-15");
  });

  it("updates hidden input value after date selection", async () => {
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date" },
    });
    const trigger = container.querySelector("button");
    if (!trigger) throw new Error("expected trigger button");

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
      expect(hidden.value).toBe("2026-02-15");
    });
  });

  it("closes popover after selecting a date", async () => {
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date" },
    });
    const trigger = container.querySelector("button");
    if (!trigger) throw new Error("expected trigger button");

    await fireEvent.click(trigger);
    await waitFor(() => {
      expect(trigger.getAttribute("data-state")).toBe("open");
    });

    const dayButton = document.querySelector("[data-mock-calendar] button[data-day='15']");
    if (!(dayButton instanceof HTMLElement)) throw new Error("expected day button");
    await fireEvent.click(dayButton);

    await waitFor(() => {
      expect(trigger.getAttribute("data-state")).toBe("closed");
    });
  });
});
