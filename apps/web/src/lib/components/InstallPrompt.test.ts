import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/svelte";
import InstallPrompt from "./InstallPrompt.svelte";

describe("InstallPrompt", () => {
  beforeEach(() => {
    // Provide a default matchMedia stub that returns false for standalone mode.
    // happy-dom does not implement window.matchMedia, so every test that renders
    // InstallPrompt must have this in place before the component mounts.
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("does not render install prompt UI by default (no beforeinstallprompt event)", () => {
    render(InstallPrompt);
    // `visible` starts false and only becomes true after a beforeinstallprompt
    // event fires followed by a 3-second delay. Neither happens in this test.
    expect(screen.queryByText("Get the Humans desktop app")).toBeNull();
    expect(screen.queryByText("Install app")).toBeNull();
  });

  it("does not render when already in standalone display mode", () => {
    // Override matchMedia to return matches: true for the standalone query.
    // The onMount guard returns early when this is true, so visible stays false.
    (window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue({
      matches: true,
      media: "(display-mode: standalone)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    render(InstallPrompt);
    expect(screen.queryByText("Get the Humans desktop app")).toBeNull();
    expect(screen.queryByText("Install app")).toBeNull();
  });
});
