import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import { axe } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/matchers";
import SearchableSelect from "./SearchableSelect.svelte";

expect.extend({ toHaveNoViolations });

describe("SearchableSelect", () => {
  // ── String mode (backward compatibility) ──────────────────────────

  const options = ["Argentina", "Australia", "Brazil", "Canada", "Chile"] as const;

  it("renders a text input", () => {
    const { container } = render(SearchableSelect, {
      props: { options, name: "country" },
    });
    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs.length).toBe(1);
  });

  it("renders a hidden input with the given name", () => {
    const { container } = render(SearchableSelect, {
      props: { options, name: "country" },
    });
    const hidden = container.querySelector('input[type="hidden"][name="country"]');
    expect(hidden).not.toBeNull();
  });

  it("uses provided placeholder", () => {
    render(SearchableSelect, {
      props: { options, name: "country", placeholder: "Pick one..." },
    });
    expect(screen.getByPlaceholderText("Pick one...")).toBeDefined();
  });

  it("uses default placeholder when not provided", () => {
    render(SearchableSelect, {
      props: { options, name: "country" },
    });
    expect(screen.getByPlaceholderText("Search...")).toBeDefined();
  });

  it("shows dropdown on focus", async () => {
    const { container } = render(SearchableSelect, {
      props: { options, name: "country" },
    });
    const input = container.querySelector('input[type="text"]')!;
    await fireEvent.focus(input);
    expect(screen.getByText("Argentina")).toBeDefined();
    expect(screen.getByText("Brazil")).toBeDefined();
  });

  it("filters options based on query", async () => {
    const { container } = render(SearchableSelect, {
      props: { options, name: "country" },
    });
    const input = container.querySelector('input[type="text"]')!;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "Ar" } });

    expect(screen.getByText("Argentina")).toBeDefined();
    expect(screen.queryByText("Brazil")).toBeNull();
  });

  it("shows empty message when no options match", async () => {
    const { container } = render(SearchableSelect, {
      props: { options, name: "country", emptyMessage: "Nothing found" },
    });
    const input = container.querySelector('input[type="text"]')!;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "zzz" } });

    expect(screen.getByText("Nothing found")).toBeDefined();
  });

  it("pre-fills with value prop", () => {
    const { container } = render(SearchableSelect, {
      props: { options, name: "country", value: "Brazil" },
    });
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe("Brazil");
  });

  // ── Key-value mode ────────────────────────────────────────────────

  const kvOptions = [
    { value: "email", label: "Email" },
    { value: "whatsapp_message", label: "WhatsApp" },
    { value: "online_meeting", label: "Meeting" },
    { value: "phone_call", label: "Phone Call" },
  ] as const;

  it("hidden input gets value (not label) in key-value mode", () => {
    const { container } = render(SearchableSelect, {
      props: { options: kvOptions, name: "type", value: "whatsapp_message" },
    });
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe("whatsapp_message");

    const text = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(text.value).toBe("WhatsApp");
  });

  it("displays labels in dropdown for key-value options", async () => {
    const { container } = render(SearchableSelect, {
      props: { options: kvOptions, name: "type" },
    });
    const input = container.querySelector('input[type="text"]')!;
    await fireEvent.focus(input);

    expect(screen.getByText("Email")).toBeDefined();
    expect(screen.getByText("WhatsApp")).toBeDefined();
    expect(screen.getByText("Meeting")).toBeDefined();
    expect(screen.getByText("Phone Call")).toBeDefined();
  });

  it("filters by label text in key-value mode", async () => {
    const { container } = render(SearchableSelect, {
      props: { options: kvOptions, name: "type" },
    });
    const input = container.querySelector('input[type="text"]')!;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "Whats" } });

    expect(screen.getByText("WhatsApp")).toBeDefined();
    expect(screen.queryByText("Email")).toBeNull();
  });

  it("onSelect fires with value (not label) in key-value mode", async () => {
    const onSelect = vi.fn();
    const { container } = render(SearchableSelect, {
      props: { options: kvOptions, name: "type", onSelect },
    });
    const input = container.querySelector('input[type="text"]')!;
    await fireEvent.focus(input);

    const meetingOption = screen.getByText("Meeting");
    await fireEvent.mouseDown(meetingOption);

    expect(onSelect).toHaveBeenCalledWith("online_meeting");
  });

  // ── Empty option ──────────────────────────────────────────────────

  it("shows empty option at top of dropdown", async () => {
    const { container } = render(SearchableSelect, {
      props: { options: kvOptions, name: "type", emptyOption: "All" },
    });
    const input = container.querySelector('input[type="text"]')!;
    await fireEvent.focus(input);

    const items = container.querySelectorAll('[role="option"]');
    expect(items[0]?.textContent?.trim()).toBe("All");
  });

  it("empty option always visible when filtering", async () => {
    const { container } = render(SearchableSelect, {
      props: { options: kvOptions, name: "type", emptyOption: "All" },
    });
    const input = container.querySelector('input[type="text"]')!;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "Phone" } });

    // Empty option should still be present
    expect(screen.getByText("All")).toBeDefined();
    // And the matching option
    expect(screen.getByText("Phone Call")).toBeDefined();
    // Non-matching should be filtered out
    expect(screen.queryByText("Email")).toBeNull();
  });

  it("selecting empty option sets value to empty string", async () => {
    const onSelect = vi.fn();
    const { container } = render(SearchableSelect, {
      props: { options: kvOptions, name: "type", emptyOption: "— None —", value: "email", onSelect },
    });
    const input = container.querySelector('input[type="text"]')!;
    await fireEvent.focus(input);

    const noneOption = screen.getByText("— None —");
    await fireEvent.mouseDown(noneOption);

    expect(onSelect).toHaveBeenCalledWith("");
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe("");
  });

  // ── Blur revert ───────────────────────────────────────────────────

  it("reverts display text to selected label after blur with unmatched search", async () => {
    vi.useFakeTimers();
    const { container } = render(SearchableSelect, {
      props: { options: kvOptions, name: "type", value: "email" },
    });
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;

    // Type a search query without selecting anything
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "xyz" } });
    await fireEvent.blur(input);

    // Wait for the blur timeout (use async to flush Svelte microtasks)
    await vi.advanceTimersByTimeAsync(200);

    // Display text should revert to the selected option's label
    expect(input.value).toBe("Email");
    // Hidden input should still have the original value
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe("email");

    vi.useRealTimers();
  });

  // ── Required prop ─────────────────────────────────────────────────

  it("forwards required attribute to text input", () => {
    const { container } = render(SearchableSelect, {
      props: { options, name: "country", required: true },
    });
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.required).toBe(true);
  });

  // ── Visual polish behaviors ────────────────────────────────────────

  describe("Visual polish behaviors", () => {
    it("renders a Check icon next to the selected option when open", async () => {
      const { container } = render(SearchableSelect, {
        props: { options, name: "country", value: "Brazil" },
      });
      const input = container.querySelector('input[type="text"]')!;
      await fireEvent.focus(input);

      const brazilOption = screen.getByText("Brazil").closest("[role='option']")!;
      expect(brazilOption.querySelector("svg")).not.toBeNull();
    });

    it("Check icon disappears from old option after selecting a new one", async () => {
      const { container } = render(SearchableSelect, {
        props: { options, name: "country", value: "Brazil" },
      });
      const input = container.querySelector('input[type="text"]')!;
      await fireEvent.focus(input);

      const canadaOption = screen.getByText("Canada");
      await fireEvent.mouseDown(canadaOption);

      await fireEvent.focus(input);

      const canadaItem = screen.getByText("Canada").closest("[role='option']")!;
      expect(canadaItem.querySelector("svg")).not.toBeNull();

      const brazilItem = screen.getByText("Brazil").closest("[role='option']")!;
      expect(brazilItem.querySelector("svg")).toBeNull();
    });

    it("chevron has no rotate-180 class when closed", () => {
      const { container } = render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const chevron = container.querySelector("div.relative > div > svg");
      expect(chevron).not.toBeNull();
      expect(chevron!.className).not.toContain("rotate-180");
    });

    it("chevron has rotate-180 class when dropdown is open", async () => {
      const { container } = render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const input = container.querySelector('input[type="text"]')!;
      await fireEvent.focus(input);

      const chevron = container.querySelector("div.relative > div > svg");
      expect(chevron).not.toBeNull();
      expect(chevron!.className).toContain("rotate-180");
    });

    it("renders a role=separator element after the empty option", async () => {
      const { container } = render(SearchableSelect, {
        props: { options: kvOptions, name: "type", emptyOption: "All" },
      });
      const input = container.querySelector('input[type="text"]')!;
      await fireEvent.focus(input);

      const separator = container.querySelector('[role="separator"]');
      expect(separator).not.toBeNull();
    });

    it("does not render separator when emptyOption is not provided", async () => {
      const { container } = render(SearchableSelect, {
        props: { options: kvOptions, name: "type" },
      });
      const input = container.querySelector('input[type="text"]')!;
      await fireEvent.focus(input);

      const separator = container.querySelector('[role="separator"]');
      expect(separator).toBeNull();
    });

    it("dropdown list has glass-dropdown-animate class", async () => {
      const { container } = render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const input = container.querySelector('input[type="text"]')!;
      await fireEvent.focus(input);

      const listbox = container.querySelector('ul[role="listbox"]');
      expect(listbox).not.toBeNull();
      expect(listbox!.classList.contains("glass-dropdown-animate")).toBe(true);
    });

    it("dropdown items use glass-dropdown-item class", async () => {
      const { container } = render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const input = container.querySelector('input[type="text"]')!;
      await fireEvent.focus(input);

      const optionItems = container.querySelectorAll('[role="option"]');
      expect(optionItems.length).toBeGreaterThan(0);
      const atLeastOne = Array.from(optionItems).some((item) =>
        item.className.includes("glass-dropdown-item")
      );
      expect(atLeastOne).toBe(true);
    });

    it("empty message uses glass-dropdown-empty class", async () => {
      const { container } = render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const input = container.querySelector('input[type="text"]')!;
      await fireEvent.focus(input);
      await fireEvent.input(input, { target: { value: "zzz" } });

      const status = container.querySelector('[role="status"]');
      expect(status).not.toBeNull();
      expect(status!.querySelector(".glass-dropdown-empty")).not.toBeNull();
    });
  });

  // ── Accessibility (axe-core) ────────────────────────────────────

  describe("Accessibility", () => {
    it("has no axe violations when closed", async () => {
      const { container } = render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has no axe violations when open", async () => {
      const { container } = render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const input = container.querySelector('input[type="text"]')!;
      await fireEvent.focus(input);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
