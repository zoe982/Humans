import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
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
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden?.id).toBe("my-picker");
  });

  it("renders the placeholder text when no value is provided", () => {
    render(GlassDateTimePicker, { props: { name: "scheduled_at" } });
    expect(screen.getByText("Pick date & time...")).toBeDefined();
  });

  it("hidden input has empty value when no value prop is provided", () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at" },
    });
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe("");
  });

  it("parses initial value and sets hidden input correctly", () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at", value: "2025-06-15T14:30:00" },
    });
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
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
    let hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe("2025-06-15T14:30:00");

    await rerender({ name: "scheduled_at", value: "2025-09-01T09:00:00" });
    hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe("2025-09-01T09:00:00");
  });
});
