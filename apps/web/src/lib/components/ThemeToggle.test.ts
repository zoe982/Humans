import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import ThemeToggle from "./ThemeToggle.svelte";

// The theme store (src/lib/stores/theme.svelte.ts) is aliased in the vitest
// config via the .svelte.ts extension alias. It initialises `current` to
// "dark" in the test environment because happy-dom's document.documentElement
// does not carry the "light" class. The aria-label therefore reads
// "Toggle light mode" on first render.

describe("ThemeToggle", () => {
  it("renders a button element", () => {
    render(ThemeToggle);
    const button = screen.getByRole("button");
    expect(button).toBeDefined();
  });

  it("button aria-label contains 'Toggle'", () => {
    render(ThemeToggle);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toContain("Toggle");
  });

  it("button aria-label contains the target mode name", () => {
    render(ThemeToggle);
    const button = screen.getByRole("button");
    const label = button.getAttribute("aria-label") ?? "";
    // In test environment currentTheme() returns "dark", so the label
    // should advertise switching to light mode.
    expect(label.toLowerCase()).toContain("light");
  });
});
