import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
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
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
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
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
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
    let hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe("2025-03-15");

    await rerender({ name: "birth_date", value: "2026-11-30" });
    hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe("2026-11-30");
  });
});
