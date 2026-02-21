import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatRelativeTime, summarizeChanges, displayName } from "./format";

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" when the date is less than 1 minute ago', () => {
    const now = new Date("2026-02-21T12:00:00Z");
    vi.setSystemTime(now);
    // 30 seconds ago — diffMins = 0
    const dateStr = new Date(now.getTime() - 30_000).toISOString();
    expect(formatRelativeTime(dateStr)).toBe("just now");
  });

  it('returns "just now" when the date is exactly now', () => {
    const now = new Date("2026-02-21T12:00:00Z");
    vi.setSystemTime(now);
    expect(formatRelativeTime(now.toISOString())).toBe("just now");
  });

  it("returns minutes ago when between 1 and 59 minutes ago", () => {
    const now = new Date("2026-02-21T12:00:00Z");
    vi.setSystemTime(now);
    const dateStr = new Date(now.getTime() - 5 * 60_000).toISOString(); // 5 minutes ago
    expect(formatRelativeTime(dateStr)).toBe("5m ago");
  });

  it("returns 59m ago at the upper boundary of the minutes range", () => {
    const now = new Date("2026-02-21T12:00:00Z");
    vi.setSystemTime(now);
    const dateStr = new Date(now.getTime() - 59 * 60_000).toISOString();
    expect(formatRelativeTime(dateStr)).toBe("59m ago");
  });

  it("returns hours ago when between 1 and 23 hours ago", () => {
    const now = new Date("2026-02-21T12:00:00Z");
    vi.setSystemTime(now);
    const dateStr = new Date(now.getTime() - 3 * 3_600_000).toISOString(); // 3 hours ago
    expect(formatRelativeTime(dateStr)).toBe("3h ago");
  });

  it("returns 23h ago at the upper boundary of the hours range", () => {
    const now = new Date("2026-02-21T12:00:00Z");
    vi.setSystemTime(now);
    const dateStr = new Date(now.getTime() - 23 * 3_600_000).toISOString();
    expect(formatRelativeTime(dateStr)).toBe("23h ago");
  });

  it("returns days ago when 24 or more hours ago", () => {
    const now = new Date("2026-02-21T12:00:00Z");
    vi.setSystemTime(now);
    const dateStr = new Date(now.getTime() - 3 * 24 * 3_600_000).toISOString(); // 3 days ago
    expect(formatRelativeTime(dateStr)).toBe("3d ago");
  });

  it("returns 1d ago when exactly 24 hours ago", () => {
    const now = new Date("2026-02-21T12:00:00Z");
    vi.setSystemTime(now);
    const dateStr = new Date(now.getTime() - 24 * 3_600_000).toISOString();
    expect(formatRelativeTime(dateStr)).toBe("1d ago");
  });
});

describe("summarizeChanges", () => {
  it('returns "No details" when passed null', () => {
    expect(summarizeChanges(null)).toBe("No details");
  });

  it("formats a single scalar field change", () => {
    const result = summarizeChanges({
      name: { old: "Alice", new: "Bob" },
    });
    expect(result).toBe('name: "Alice" \u2192 "Bob"');
  });

  it("formats multiple field changes separated by semicolons", () => {
    const result = summarizeChanges({
      firstName: { old: "Alice", new: "Alicia" },
      lastName: { old: "Smith", new: "Jones" },
    });
    expect(result).toBe('firstName: "Alice" \u2192 "Alicia"; lastName: "Smith" \u2192 "Jones"');
  });

  it("formats array values by joining with a comma", () => {
    const result = summarizeChanges({
      tags: { old: ["cat", "dog"], new: ["cat", "bird"] },
    });
    expect(result).toBe('tags: "cat, dog" \u2192 "cat, bird"');
  });

  it('renders null old/new values as "empty"', () => {
    const result = summarizeChanges({
      nickname: { old: null, new: "Bobby" },
    });
    expect(result).toBe('nickname: "empty" \u2192 "Bobby"');
  });

  it('renders undefined old/new values as "empty"', () => {
    const result = summarizeChanges({
      nickname: { old: undefined, new: undefined },
    });
    expect(result).toBe('nickname: "empty" \u2192 "empty"');
  });

  it("handles an empty changes object", () => {
    expect(summarizeChanges({})).toBe("");
  });

  it("handles a mix of array and scalar values in the same change set", () => {
    const result = summarizeChanges({
      name: { old: "Alice", new: "Bob" },
      roles: { old: ["admin"], new: ["admin", "editor"] },
    });
    expect(result).toBe('name: "Alice" \u2192 "Bob"; roles: "admin" \u2192 "admin, editor"');
  });
});

describe("displayName", () => {
  it("returns first and last name when no middle name is provided", () => {
    expect(displayName({ firstName: "John", lastName: "Doe" })).toBe("John Doe");
  });

  it("includes the middle name when provided", () => {
    expect(displayName({ firstName: "John", middleName: "Paul", lastName: "Doe" })).toBe("John Paul Doe");
  });

  it("omits middle name when it is null", () => {
    expect(displayName({ firstName: "Jane", middleName: null, lastName: "Smith" })).toBe("Jane Smith");
  });

  it("omits middle name when it is an empty string", () => {
    expect(displayName({ firstName: "Jane", middleName: "", lastName: "Smith" })).toBe("Jane Smith");
  });

  it("omits middle name when it is undefined", () => {
    expect(displayName({ firstName: "Jane", middleName: undefined, lastName: "Smith" })).toBe("Jane Smith");
  });
});
