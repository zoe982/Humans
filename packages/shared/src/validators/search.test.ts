import { describe, it, expect } from "vitest";
import { searchQuerySchema } from "./search";

describe("searchQuerySchema", () => {
  it("accepts valid query", () => {
    const result = searchQuerySchema.parse({ q: "john doe" });
    expect(result.q).toBe("john doe");
  });

  it("rejects empty query", () => {
    expect(() => searchQuerySchema.parse({ q: "" })).toThrowError();
  });

  it("rejects missing q field", () => {
    expect(() => searchQuerySchema.parse({})).toThrowError();
  });

  it("accepts single character query", () => {
    const result = searchQuerySchema.parse({ q: "a" });
    expect(result.q).toBe("a");
  });
});
