import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/lib/logger", () => ({
  logWarn: vi.fn(),
}));
vi.mock("../../../src/lib/error-logger", () => ({
  persistError: vi.fn(),
}));

import { assertUniqueIds } from "../../../src/lib/assert-unique-ids";
import { logWarn } from "../../../src/lib/logger";
import { persistError } from "../../../src/lib/error-logger";

describe("assertUniqueIds", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns items unchanged when all IDs are unique", () => {
    const items = [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
      { id: "c", name: "Charlie" },
    ];

    const result = assertUniqueIds(items, "test");

    expect(result).toEqual(items);
    expect(logWarn).not.toHaveBeenCalled();
    expect(persistError).not.toHaveBeenCalled();
  });

  it("deduplicates items and logs warning when duplicates found", () => {
    const items = [
      { id: "a", name: "First" },
      { id: "b", name: "Bob" },
      { id: "a", name: "Duplicate" },
    ];

    const result = assertUniqueIds(items, "activity");

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { id: "a", name: "First" },
      { id: "b", name: "Bob" },
    ]);
    expect(logWarn).toHaveBeenCalledWith(
      "Duplicate IDs detected in activity",
      expect.objectContaining({
        code: "DUPLICATE_IDS",
      }),
    );
    expect(persistError).not.toHaveBeenCalled();
  });

  it("persists error to D1 when context is provided", () => {
    const items = [
      { id: "x", val: 1 },
      { id: "x", val: 2 },
      { id: "y", val: 3 },
    ];

    const mockContext = {
      get: (key: string) => key === "requestId" ? "req-abc" : undefined,
      req: { method: "GET", path: "/api/widgets" },
    } as any;
    const result = assertUniqueIds(items, "widget", mockContext);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "x", val: 1 });
    expect(result[1]).toEqual({ id: "y", val: 3 });

    expect(logWarn).toHaveBeenCalled();
    expect(persistError).toHaveBeenCalledWith(
      mockContext,
      expect.objectContaining({
        code: "DUPLICATE_IDS",
        message: expect.stringContaining("Duplicate IDs"),
        details: expect.objectContaining({
          entityType: "widget",
          duplicateIds: ["x"],
          totalItems: 3,
          uniqueItems: 2,
        }),
      }),
    );
  });

  it("handles empty array without logging", () => {
    const result = assertUniqueIds([], "empty");

    expect(result).toEqual([]);
    expect(logWarn).not.toHaveBeenCalled();
    expect(persistError).not.toHaveBeenCalled();
  });

  it("handles single-item array without logging", () => {
    const items = [{ id: "only", data: "one" }];
    const result = assertUniqueIds(items, "single");

    expect(result).toEqual(items);
    expect(logWarn).not.toHaveBeenCalled();
    expect(persistError).not.toHaveBeenCalled();
  });

  it("reports all duplicate IDs, not just one", () => {
    const items = [
      { id: "a" },
      { id: "a" },
      { id: "b" },
      { id: "b" },
      { id: "c" },
    ];

    const result = assertUniqueIds(items, "multi");

    expect(result).toHaveLength(3);
    expect(logWarn).toHaveBeenCalledWith(
      "Duplicate IDs detected in multi",
      expect.objectContaining({
        code: "DUPLICATE_IDS",
      }),
    );
  });
});
