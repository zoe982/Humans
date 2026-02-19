import { describe, it, expect } from "vitest";
import { createId } from "./id";

describe("createId", () => {
  it("returns a non-empty string", () => {
    const id = createId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique ids on successive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => createId()));
    expect(ids.size).toBe(100);
  });
});
