import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import CommandPalette from "./CommandPalette.svelte";

// The categoryIcons mapping covers these categories
const CATEGORIES = ["Humans", "Accounts", "Activities", "Geo-Interests", "Route Signups"] as const;

function makeResult(overrides: Partial<{
  id: string;
  label: string;
  sublabel: string;
  href: string;
  category: string;
}> = {}) {
  return {
    id: "r-1",
    label: "Jane Doe",
    sublabel: "jane@example.com",
    href: "/humans/r-1",
    category: "Humans",
    ...overrides,
  };
}

function mockFetchSuccess(results: ReturnType<typeof makeResult>[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results }),
    }),
  );
}

function mockFetchFailure() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }),
  );
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ── Closed state ─────────────────────────────────────────────────

  it("renders nothing interactive when open is false", () => {
    render(CommandPalette, { props: { open: false } });
    expect(screen.queryByTestId("command-palette-input")).toBeNull();
  });

  // ── Open state ───────────────────────────────────────────────────

  it("renders search input when open is true", () => {
    render(CommandPalette, { props: { open: true } });
    expect(screen.getByTestId("command-palette-input")).toBeDefined();
  });

  it("shows footer hint when open with no query", () => {
    render(CommandPalette, { props: { open: true } });
    expect(screen.getByText(/Type at least 2 characters to search/)).toBeDefined();
  });

  it("shows navigation kbd hints in footer", () => {
    render(CommandPalette, { props: { open: true } });
    // All three navigation keys should appear
    const kbdElements = document
      .querySelectorAll("kbd");
    const kbdTexts = Array.from(kbdElements).map((k) => k.textContent?.trim());
    expect(kbdTexts).toContain("↑");
    expect(kbdTexts).toContain("↓");
    expect(kbdTexts).toContain("Enter");
  });

  it("shows esc kbd hint in input area", () => {
    render(CommandPalette, { props: { open: true } });
    const kbdElements = document.querySelectorAll("kbd");
    const kbdTexts = Array.from(kbdElements).map((k) => k.textContent?.trim());
    expect(kbdTexts).toContain("esc");
  });

  // ── Input and clear button ────────────────────────────────────────

  it("does not show clear button when query is empty", () => {
    render(CommandPalette, { props: { open: true } });
    expect(screen.queryByLabelText("Clear search")).toBeNull();
  });

  it("shows clear button when query is non-empty", async () => {
    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "ja" } });
    expect(screen.getByLabelText("Clear search")).toBeDefined();
  });

  it("clear button resets query and removes itself", async () => {
    mockFetchSuccess([]);
    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input") as HTMLInputElement;

    await fireEvent.input(input, { target: { value: "jane" } });
    const clearBtn = screen.getByLabelText("Clear search");
    await fireEvent.click(clearBtn);

    expect(screen.queryByLabelText("Clear search")).toBeNull();
  });

  // ── Debounced fetch: short query ──────────────────────────────────

  it("does not call fetch when query is less than 2 characters", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "j" } });
    await vi.runAllTimersAsync();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls fetch with encoded query after debounce when query >= 2 chars", async () => {
    mockFetchSuccess([]);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "ja" } });
    await vi.runAllTimersAsync();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/command-search?q=ja",
    );
  });

  it("encodes special characters in query", async () => {
    mockFetchSuccess([]);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "foo bar" } });
    await vi.runAllTimersAsync();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/command-search?q=foo%20bar",
    );
  });

  it("does not call fetch until debounce delay elapses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "jane" } });

    // Before 200ms elapses, fetch should not have been called
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchMock).not.toHaveBeenCalled();

    // After 200ms, fetch fires
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("debounces rapid consecutive inputs to a single fetch call", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");

    await fireEvent.input(input, { target: { value: "ja" } });
    await vi.advanceTimersByTimeAsync(50);
    await fireEvent.input(input, { target: { value: "jan" } });
    await vi.advanceTimersByTimeAsync(50);
    await fireEvent.input(input, { target: { value: "jane" } });
    await vi.runAllTimersAsync();

    // Only a single fetch call should have been made (for the final value)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // ── Loading state ─────────────────────────────────────────────────

  it("shows loading state while fetch is in flight", async () => {
    let resolveFetch!: (v: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "jane" } });
    await vi.runAllTimersAsync();

    expect(screen.getByTestId("loading-state")).toBeDefined();
    expect(screen.getByText("Searching...")).toBeDefined();

    // Resolve the fetch so afterEach cleanup is clean
    resolveFetch({ ok: true, json: async () => ({ results: [] }) });
  });

  // ── Results rendering ─────────────────────────────────────────────

  it("shows result label and category after successful fetch", async () => {
    mockFetchSuccess([makeResult({ label: "Jane Doe", category: "Humans" })]);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "ja" } });
    await vi.runAllTimersAsync();

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeDefined();
      expect(screen.getByText("Humans")).toBeDefined();
    });
  });

  it("shows sublabel when result has one", async () => {
    mockFetchSuccess([makeResult({ sublabel: "jane@example.com" })]);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "ja" } });
    await vi.runAllTimersAsync();

    await waitFor(() => {
      expect(screen.getByText("jane@example.com")).toBeDefined();
    });
  });

  it("does not show sublabel when result has none", async () => {
    mockFetchSuccess([makeResult({ sublabel: undefined })]);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "ja" } });
    await vi.runAllTimersAsync();

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeDefined();
    });
    // No second paragraph inside the result item
    const subtexts = document.querySelectorAll("p.text-xs");
    expect(subtexts).toHaveLength(0);
  });

  it("renders multiple results", async () => {
    mockFetchSuccess([
      makeResult({ id: "r-1", label: "Alice" }),
      makeResult({ id: "r-2", label: "Bob" }),
      makeResult({ id: "r-3", label: "Charlie" }),
    ]);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "ja" } });
    await vi.runAllTimersAsync();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeDefined();
      expect(screen.getByText("Bob")).toBeDefined();
      expect(screen.getByText("Charlie")).toBeDefined();
    });
  });

  // ── Empty state ───────────────────────────────────────────────────

  it("shows empty state when fetch returns no results and query >= 2 chars", async () => {
    mockFetchSuccess([]);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "zz" } });
    await vi.runAllTimersAsync();

    await waitFor(() => {
      expect(screen.getByText("No results found.")).toBeDefined();
    });
  });

  it("does not show empty state when query is shorter than 2 chars", () => {
    render(CommandPalette, { props: { open: true } });
    expect(screen.queryByText("No results found.")).toBeNull();
  });

  it("hides footer hint once results are present", async () => {
    mockFetchSuccess([makeResult()]);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "ja" } });
    await vi.runAllTimersAsync();

    await waitFor(() => {
      expect(screen.queryByText(/Type at least 2 characters/)).toBeNull();
    });
  });

  // ── Error state ───────────────────────────────────────────────────

  it("shows empty state when fetch returns non-ok response", async () => {
    mockFetchFailure();

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "ja" } });
    await vi.runAllTimersAsync();

    await waitFor(() => {
      expect(screen.getByText("No results found.")).toBeDefined();
    });
  });

  it("clears results when query drops below 2 chars after a search", async () => {
    mockFetchSuccess([makeResult()]);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");

    await fireEvent.input(input, { target: { value: "ja" } });
    await vi.runAllTimersAsync();
    await waitFor(() => expect(screen.getByText("Jane Doe")).toBeDefined());

    await fireEvent.input(input, { target: { value: "j" } });
    await vi.runAllTimersAsync();

    await waitFor(() => {
      expect(screen.queryByText("Jane Doe")).toBeNull();
    });
  });

  // ── Category icons mapping ────────────────────────────────────────

  it.each(CATEGORIES)("renders a result for category %s without error", async (category) => {
    mockFetchSuccess([makeResult({ category })]);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "te" } });
    await vi.runAllTimersAsync();

    await waitFor(() => {
      expect(screen.getByText(category)).toBeDefined();
    });
  });

  it("falls back to Search icon for unknown category", async () => {
    mockFetchSuccess([makeResult({ category: "Unknown" })]);

    render(CommandPalette, { props: { open: true } });
    const input = screen.getByTestId("command-palette-input");
    await fireEvent.input(input, { target: { value: "te" } });
    await vi.runAllTimersAsync();

    await waitFor(() => {
      // Result still renders without throwing
      expect(screen.getByText("Jane Doe")).toBeDefined();
    });
  });
});
