import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import GlassDateTimePicker from "./GlassDateTimePicker.svelte";

describe("GlassDateTimePicker", () => {
  it("renders a datetime-local input with the given name", () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at" },
    });
    const input = container.querySelector('input[type="datetime-local"][name="scheduled_at"]');
    expect(input).not.toBeNull();
  });

  it("renders the given id on the input", () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at", id: "my-picker" },
    });
    const input = container.querySelector('input[type="datetime-local"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("expected datetime input");
    expect(input.id).toBe("my-picker");
  });

  it("has empty value when no value prop is provided", () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at" },
    });
    const input = container.querySelector('input[type="datetime-local"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("expected datetime input");
    expect(input.value).toBe("");
  });

  it("sets value from prop (strips seconds for datetime-local)", () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at", value: "2025-06-15T14:30:00" },
    });
    const input = container.querySelector('input[type="datetime-local"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("expected datetime input");
    expect(input.value).toBe("2025-06-15T14:30");
  });

  it("updates value when prop changes via rerender", async () => {
    const { container, rerender } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at", value: "2025-06-15T14:30:00" },
    });
    let input = container.querySelector('input[type="datetime-local"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("expected datetime input");
    expect(input.value).toBe("2025-06-15T14:30");

    await rerender({ name: "scheduled_at", value: "2025-09-01T09:00:00" });
    input = container.querySelector('input[type="datetime-local"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("expected datetime input");
    expect(input.value).toBe("2025-09-01T09:00");
  });

  it("calls onchange with seconds appended when user selects datetime", async () => {
    const onchange = vi.fn();
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at", onchange },
    });
    const input = container.querySelector('input[type="datetime-local"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("expected datetime input");

    input.value = "2026-02-15T12:00";
    await fireEvent.input(input);

    expect(onchange).toHaveBeenCalledOnce();
    expect(onchange).toHaveBeenCalledWith("2026-02-15T12:00:00");
  });

  it("has glass-input styling class", () => {
    const { container } = render(GlassDateTimePicker, {
      props: { name: "scheduled_at" },
    });
    const input = container.querySelector('input[type="datetime-local"]');
    if (!(input instanceof HTMLElement)) throw new Error("expected datetime input");
    expect(input.classList.contains("glass-input")).toBe(true);
  });
});
