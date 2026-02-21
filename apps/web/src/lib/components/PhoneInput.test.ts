import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import { axe } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/matchers";
import PhoneInput from "./PhoneInput.svelte";

expect.extend({ toHaveNoViolations });

describe("PhoneInput", () => {
  it("renders a hidden input with the given name", () => {
    const { container } = render(PhoneInput, { props: { name: "phone" } });
    const hidden = container.querySelector('input[type="hidden"][name="phone"]');
    expect(hidden).not.toBeNull();
  });

  it("renders a tel input", () => {
    const { container } = render(PhoneInput, { props: { name: "phone" } });
    const tel = container.querySelector('input[type="tel"]');
    expect(tel).not.toBeNull();
  });

  it("shows country code button defaulting to US", () => {
    render(PhoneInput, { props: { name: "phone" } });
    expect(screen.getByText("+1")).toBeDefined();
  });

  it("shows phone number placeholder", () => {
    render(PhoneInput, { props: { name: "phone" } });
    expect(screen.getByPlaceholderText("Phone number")).toBeDefined();
  });

  it("parses initial value with dial code", () => {
    const { container } = render(PhoneInput, {
      props: { name: "phone", value: "+44 7911123456" },
    });
    // Should show UK dial code
    expect(screen.getByText("+44")).toBeDefined();
    const tel = container.querySelector('input[type="tel"]') as HTMLInputElement;
    expect(tel.value).toBe("7911123456");
  });

  it("falls back to raw digits when dial code not found", () => {
    const { container } = render(PhoneInput, {
      props: { name: "phone", value: "5551234567" },
    });
    const tel = container.querySelector('input[type="tel"]') as HTMLInputElement;
    expect(tel.value).toBe("5551234567");
  });

  it("hidden input starts empty when no value provided", () => {
    const { container } = render(PhoneInput, { props: { name: "phone" } });
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe("");
  });

  // ── Accessibility (axe-core) ────────────────────────────────────

  describe("Accessibility", () => {
    it("has no axe violations when closed", async () => {
      const { container } = render(PhoneInput, { props: { name: "phone" } });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has no axe violations when dropdown is open", async () => {
      const { container } = render(PhoneInput, { props: { name: "phone" } });
      const trigger = container.querySelector('button[aria-label="Select country code"]')!;
      await fireEvent.click(trigger);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
