import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import GlassDatePicker from "./GlassDatePicker.svelte";

describe("GlassDatePicker", () => {
  it("renders a date input with the given name", () => {
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date" },
    });
    const input = container.querySelector('input[type="date"][name="birth_date"]');
    expect(input).not.toBeNull();
  });

  it("renders the given id on the input", () => {
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date", id: "my-picker" },
    });
    const input = container.querySelector('input[type="date"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("expected date input");
    expect(input.id).toBe("my-picker");
  });

  it("has empty value when no value prop is provided", () => {
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date" },
    });
    const input = container.querySelector('input[type="date"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("expected date input");
    expect(input.value).toBe("");
  });

  it("sets value from prop", () => {
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date", value: "2025-03-15" },
    });
    const input = container.querySelector('input[type="date"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("expected date input");
    expect(input.value).toBe("2025-03-15");
  });

  it("updates value when prop changes via rerender", async () => {
    const { container, rerender } = render(GlassDatePicker, {
      props: { name: "birth_date", value: "2025-03-15" },
    });
    let input = container.querySelector('input[type="date"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("expected date input");
    expect(input.value).toBe("2025-03-15");

    await rerender({ name: "birth_date", value: "2026-11-30" });
    input = container.querySelector('input[type="date"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("expected date input");
    expect(input.value).toBe("2026-11-30");
  });

  it("calls onchange when user selects a date", async () => {
    const onchange = vi.fn();
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date", onchange },
    });
    const input = container.querySelector('input[type="date"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("expected date input");

    // Simulate user picking a date
    input.value = "2026-02-15";
    await fireEvent.input(input);

    expect(onchange).toHaveBeenCalledOnce();
    expect(onchange).toHaveBeenCalledWith("2026-02-15");
  });

  it("has glass-input styling class", () => {
    const { container } = render(GlassDatePicker, {
      props: { name: "birth_date" },
    });
    const input = container.querySelector('input[type="date"]');
    if (!(input instanceof HTMLElement)) throw new Error("expected date input");
    expect(input.classList.contains("glass-input")).toBe(true);
  });
});
