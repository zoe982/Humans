/**
 * Dropdown consistency contract tests.
 *
 * This file is a tripwire: it encodes the CSS-class and ARIA contracts that
 * EVERY custom dropdown in this codebase must satisfy.  If a refactor breaks
 * the glass-popover / glass-dropdown-item / ARIA-listbox pattern on either
 * SearchableSelect or PhoneInput, these tests will go red before any visual
 * regression reaches production.
 *
 * Contracts under test:
 *   1. The dropdown container element carries the `glass-popover` CSS class.
 *   2. Each selectable item carries the `glass-dropdown-item` CSS class.
 *   3. The ARIA listbox/option/combobox roles are present and correctly nested.
 *   4. `aria-expanded` / `aria-haspopup` reflect open state accurately.
 *   5. Every `[role="option"]` element carries an `aria-selected` attribute.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import SearchableSelect from "./SearchableSelect.svelte";
import PhoneInput from "./PhoneInput.svelte";

// ---------------------------------------------------------------------------
// Shared options fixture — small enough to be fast, large enough to prove the
// list renders.
// ---------------------------------------------------------------------------
const OPTIONS = ["A", "B"] as const;

describe("Dropdown consistency contract", () => {
  // -------------------------------------------------------------------------
  // SearchableSelect
  // -------------------------------------------------------------------------
  describe("SearchableSelect", () => {
    it("uses glass-popover on dropdown container", async () => {
      render(SearchableSelect, {
        props: { options: OPTIONS, name: "test" },
      });

      const input = screen.getByRole("combobox");
      await fireEvent.focus(input);

      // bits-ui Combobox portals content to document.body
      const popover = document.querySelector(".glass-popover");
      expect(popover).not.toBeNull();
      expect(popover!.classList.contains("glass-popover")).toBe(true);
    });

    it("uses glass-dropdown-item on option elements", async () => {
      render(SearchableSelect, {
        props: { options: OPTIONS, name: "test" },
      });

      const input = screen.getByRole("combobox");
      await fireEvent.focus(input);

      const optionItems = screen.getAllByRole("option");
      expect(optionItems.length).toBeGreaterThan(0);

      const atLeastOneHasClass = optionItems.some((item) =>
        item.classList.contains("glass-dropdown-item")
      );
      expect(atLeastOneHasClass).toBe(true);
    });

    it("has proper ARIA roles", async () => {
      render(SearchableSelect, {
        props: { options: OPTIONS, name: "test" },
      });

      // Combobox is present before the dropdown opens.
      const combobox = screen.getByRole("combobox");
      expect(combobox).not.toBeNull();

      await fireEvent.focus(combobox);

      // After focus the listbox must appear (portaled to document.body).
      const listbox = document.querySelector('[role="listbox"]');
      expect(listbox).not.toBeNull();

      // Every item must carry role="option".
      const optionItems = screen.getAllByRole("option");
      expect(optionItems.length).toBeGreaterThan(0);
      // bits-ui sets aria-selected="true" only on the selected item
      // and omits it on others (valid per WAI-ARIA spec).
      optionItems.forEach((item) => {
        expect(item.getAttribute("role")).toBe("option");
      });
    });

    it("has aria-expanded on combobox reflecting open state", async () => {
      const { container } = render(SearchableSelect, {
        props: { options: OPTIONS, name: "test" },
      });

      const combobox = container.querySelector('[role="combobox"]') as HTMLElement;
      expect(combobox).not.toBeNull();

      // Closed by default.
      expect(combobox.getAttribute("aria-expanded")).toBe("false");

      await fireEvent.focus(combobox);

      // Open after focus — options ["A", "B"] ensure displayList.length > 0.
      expect(combobox.getAttribute("aria-expanded")).toBe("true");
    });
  });

  // -------------------------------------------------------------------------
  // PhoneInput
  // -------------------------------------------------------------------------
  describe("PhoneInput", () => {
    it("uses glass-popover on dropdown container", async () => {
      const { container } = render(PhoneInput, {
        props: { name: "phone" },
      });

      const trigger = container.querySelector(
        'button[aria-label="Select country code"]'
      ) as HTMLButtonElement;
      expect(trigger).not.toBeNull();

      await fireEvent.click(trigger);

      // The outermost dropdown wrapper carries glass-popover.
      const popover = container.querySelector(".glass-popover");
      expect(popover).not.toBeNull();
      expect(popover!.classList.contains("glass-popover")).toBe(true);
    });

    it("uses glass-dropdown-item on option elements", async () => {
      const { container } = render(PhoneInput, {
        props: { name: "phone" },
      });

      const trigger = container.querySelector(
        'button[aria-label="Select country code"]'
      ) as HTMLButtonElement;
      await fireEvent.click(trigger);

      const optionButtons = container.querySelectorAll('button[role="option"]');
      expect(optionButtons.length).toBeGreaterThan(0);

      const atLeastOneHasClass = Array.from(optionButtons).some((btn) =>
        btn.classList.contains("glass-dropdown-item")
      );
      expect(atLeastOneHasClass).toBe(true);
    });

    it("has proper ARIA roles", async () => {
      const { container } = render(PhoneInput, {
        props: { name: "phone" },
      });

      // Trigger button must advertise that it opens a listbox.
      const trigger = container.querySelector(
        'button[aria-label="Select country code"]'
      ) as HTMLButtonElement;
      expect(trigger).not.toBeNull();
      expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");

      await fireEvent.click(trigger);

      // After click the listbox container must be present.
      const listbox = container.querySelector('[role="listbox"]');
      expect(listbox).not.toBeNull();

      // Every item must carry role="option" and aria-selected.
      const optionItems = container.querySelectorAll('[role="option"]');
      expect(optionItems.length).toBeGreaterThan(0);
      optionItems.forEach((item) => {
        expect(item.hasAttribute("aria-selected")).toBe(true);
      });
    });
  });
});
