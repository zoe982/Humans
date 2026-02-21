import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import SearchableSelect from "./SearchableSelect.svelte";

describe("SearchableSelect", () => {
  // ── String mode (backward compatibility) ──────────────────────────

  const options = ["Argentina", "Australia", "Brazil", "Canada", "Chile"] as const;

  it("renders a combobox input", () => {
    render(SearchableSelect, {
      props: { options, name: "country" },
    });
    const input = screen.getByRole("combobox");
    expect(input).toBeDefined();
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
    render(SearchableSelect, {
      props: { options, name: "country" },
    });
    const input = screen.getByRole("combobox");
    await fireEvent.focus(input);
    expect(screen.getByText("Argentina")).toBeDefined();
    expect(screen.getByText("Brazil")).toBeDefined();
  });

  it("filters options based on query", async () => {
    render(SearchableSelect, {
      props: { options, name: "country" },
    });
    const input = screen.getByRole("combobox");
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "Ar" } });

    expect(screen.getByText("Argentina")).toBeDefined();
    expect(screen.queryByText("Brazil")).toBeNull();
  });

  it("shows empty message when no options match", async () => {
    render(SearchableSelect, {
      props: { options, name: "country", emptyMessage: "Nothing found" },
    });
    const input = screen.getByRole("combobox");
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

    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input.value).toBe("WhatsApp");
  });

  it("displays labels in dropdown for key-value options", async () => {
    render(SearchableSelect, {
      props: { options: kvOptions, name: "type" },
    });
    const input = screen.getByRole("combobox");
    await fireEvent.focus(input);

    expect(screen.getByText("Email")).toBeDefined();
    expect(screen.getByText("WhatsApp")).toBeDefined();
    expect(screen.getByText("Meeting")).toBeDefined();
    expect(screen.getByText("Phone Call")).toBeDefined();
  });

  it("filters by label text in key-value mode", async () => {
    render(SearchableSelect, {
      props: { options: kvOptions, name: "type" },
    });
    const input = screen.getByRole("combobox");
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "Whats" } });

    expect(screen.getByText("WhatsApp")).toBeDefined();
    expect(screen.queryByText("Email")).toBeNull();
  });

  it("onSelect fires with value (not label) in key-value mode", async () => {
    const onSelect = vi.fn();
    render(SearchableSelect, {
      props: { options: kvOptions, name: "type", onSelect },
    });
    const input = screen.getByRole("combobox");
    await fireEvent.focus(input);

    const meetingItem = screen.getByText("Meeting").closest("[role='option']")!;
    await fireEvent.pointerUp(meetingItem);

    expect(onSelect).toHaveBeenCalledWith("online_meeting");
  });

  // ── Empty option ──────────────────────────────────────────────────

  it("shows empty option at top of dropdown", async () => {
    render(SearchableSelect, {
      props: { options: kvOptions, name: "type", emptyOption: "All" },
    });
    const input = screen.getByRole("combobox");
    await fireEvent.focus(input);

    const items = screen.getAllByRole("option");
    expect(items[0]?.textContent?.trim()).toBe("All");
  });

  it("empty option always visible when filtering", async () => {
    render(SearchableSelect, {
      props: { options: kvOptions, name: "type", emptyOption: "All" },
    });
    const input = screen.getByRole("combobox");
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
    const input = screen.getByRole("combobox");
    await fireEvent.focus(input);

    const noneItem = screen.getByText("— None —").closest("[role='option']")!;
    await fireEvent.pointerUp(noneItem);

    expect(onSelect).toHaveBeenCalledWith("");
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe("");
  });

  // ── Blur revert ───────────────────────────────────────────────────

  it("reverts display text to selected label after closing with unmatched search", async () => {
    render(SearchableSelect, {
      props: { options: kvOptions, name: "type", value: "email" },
    });
    const input = screen.getByRole("combobox") as HTMLInputElement;

    // Open, type a search query, then press Tab to close
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "xyz" } });
    await fireEvent.keyDown(input, { key: "Tab" });

    // Display text should revert to the selected option's label
    // (may need a reactive tick for bits-ui to sync the inputValue prop)
    await waitFor(() => expect(input.value).toBe("Email"));
  });

  // ── Required prop ─────────────────────────────────────────────────

  it("forwards required attribute to combobox input", () => {
    render(SearchableSelect, {
      props: { options, name: "country", required: true },
    });
    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input.required).toBe(true);
  });

  // ── Visual polish behaviors ────────────────────────────────────────

  describe("Visual polish behaviors", () => {
    it("renders a Check icon next to the selected option when open", async () => {
      render(SearchableSelect, {
        props: { options, name: "country", value: "Brazil" },
      });
      const input = screen.getByRole("combobox");
      await fireEvent.focus(input);

      const brazilOption = screen.getByText("Brazil").closest("[role='option']")!;
      expect(brazilOption.querySelector("[data-icon]")).not.toBeNull();
    });

    it("Check icon disappears from old option after selecting a new one", async () => {
      render(SearchableSelect, {
        props: { options, name: "country", value: "Brazil" },
      });
      const input = screen.getByRole("combobox");
      await fireEvent.focus(input);

      const canadaItem = screen.getByText("Canada").closest("[role='option']")!;
      await fireEvent.pointerUp(canadaItem);

      await fireEvent.focus(input);

      const canadaItemAfter = screen.getByText("Canada").closest("[role='option']")!;
      expect(canadaItemAfter.querySelector("[data-icon]")).not.toBeNull();

      const brazilItem = screen.getByText("Brazil").closest("[role='option']")!;
      expect(brazilItem.querySelector("[data-icon]")).toBeNull();
    });

    it("chevron is present and combobox reports closed state", () => {
      const { container } = render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const chevron = container.querySelector("[data-icon]");
      expect(chevron).not.toBeNull();
      const combobox = screen.getByRole("combobox");
      expect(combobox.getAttribute("aria-expanded")).toBe("false");
    });

    it("combobox reports open state when dropdown is open", async () => {
      render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const input = screen.getByRole("combobox");
      await fireEvent.focus(input);

      expect(input.getAttribute("aria-expanded")).toBe("true");
    });

    it("renders a role=separator element after the empty option", async () => {
      render(SearchableSelect, {
        props: { options: kvOptions, name: "type", emptyOption: "All" },
      });
      const input = screen.getByRole("combobox");
      await fireEvent.focus(input);

      const separator = document.querySelector('[role="separator"]');
      expect(separator).not.toBeNull();
    });

    it("does not render separator when emptyOption is not provided", async () => {
      render(SearchableSelect, {
        props: { options: kvOptions, name: "type" },
      });
      const input = screen.getByRole("combobox");
      await fireEvent.focus(input);

      const separator = document.querySelector('[role="separator"]');
      expect(separator).toBeNull();
    });

    it("dropdown content has glass-dropdown-animate class", async () => {
      render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const input = screen.getByRole("combobox");
      await fireEvent.focus(input);

      const content = document.querySelector(".glass-dropdown-animate");
      expect(content).not.toBeNull();
    });

    it("dropdown items use glass-dropdown-item class", async () => {
      render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const input = screen.getByRole("combobox");
      await fireEvent.focus(input);

      const optionItems = screen.getAllByRole("option");
      expect(optionItems.length).toBeGreaterThan(0);
      const atLeastOne = optionItems.some((item) =>
        item.className.includes("glass-dropdown-item")
      );
      expect(atLeastOne).toBe(true);
    });

    it("empty message uses glass-dropdown-empty class", async () => {
      render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const input = screen.getByRole("combobox");
      await fireEvent.focus(input);
      await fireEvent.input(input, { target: { value: "zzz" } });

      const emptyEl = document.querySelector(".glass-dropdown-empty");
      expect(emptyEl).not.toBeNull();
    });
  });

  // ── Dropdown layout ────────────────────────────────────────────

  describe("Dropdown layout", () => {
    it("with emptyOption='None' and no real options, dropdown shows exactly 1 item", async () => {
      render(SearchableSelect, {
        props: { options: [], emptyOption: "None", name: "test", placeholder: "Pick..." },
      });
      const input = screen.getByRole("combobox");
      await fireEvent.focus(input);

      const optionItems = screen.getAllByRole("option");
      expect(optionItems).toHaveLength(1);
      expect(optionItems[0]?.textContent?.trim()).toBe("None");
    });

    it("selecting emptyOption fires onSelect with empty string", async () => {
      const onSelect = vi.fn();
      render(SearchableSelect, {
        props: {
          options: [{ value: "a", label: "Alpha" }],
          emptyOption: "None",
          name: "test",
          onSelect,
        },
      });
      const input = screen.getByRole("combobox");
      await fireEvent.focus(input);

      const noneItem = screen.getByText("None").closest("[role='option']")!;
      await fireEvent.pointerUp(noneItem);

      expect(onSelect).toHaveBeenCalledWith("");
    });

    it("dropdown content has min-w-[8rem] class", async () => {
      render(SearchableSelect, {
        props: { options, name: "test" },
      });
      const input = screen.getByRole("combobox");
      await fireEvent.focus(input);

      const content = document.querySelector(".glass-popover");
      expect(content).not.toBeNull();
      expect(content!.classList.contains("min-w-[8rem]")).toBe(true);
    });
  });

  // ── Accessibility ────────────────────────────────────────────────

  describe("Accessibility", () => {
    it("combobox has correct aria attributes when closed", () => {
      render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const combobox = screen.getByRole("combobox");
      expect(combobox.getAttribute("aria-expanded")).toBe("false");
      expect(combobox.getAttribute("aria-autocomplete")).toBe("list");
    });

    it("combobox has correct aria attributes when open", async () => {
      render(SearchableSelect, {
        props: { options, name: "country" },
      });
      const combobox = screen.getByRole("combobox");
      await fireEvent.focus(combobox);
      expect(combobox.getAttribute("aria-expanded")).toBe("true");
    });
  });
});
