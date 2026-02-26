import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { validateResponse } from "$lib/server/validate-response";

const testSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const context = { url: "/api/test", schemaName: "testSchema" };

describe("validateResponse", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("when data is valid", () => {
    it("returns parsed data in strict mode", () => {
      const data = { id: "1", name: "Alice" };
      const result = validateResponse(testSchema, data, { ...context, strict: true });
      expect(result).toStrictEqual({ id: "1", name: "Alice" });
    });

    it("returns parsed data in lenient mode", () => {
      const data = { id: "1", name: "Alice" };
      const result = validateResponse(testSchema, data, { ...context, strict: false });
      expect(result).toStrictEqual({ id: "1", name: "Alice" });
    });
  });

  describe("strict mode (dev)", () => {
    it("throws when data is invalid", () => {
      const data = { id: 123, name: "Alice" };
      expect(() => validateResponse(testSchema, data, { ...context, strict: true })).toThrowError(
        /testSchema/,
      );
    });

    it("includes URL in error message", () => {
      const data = { id: 123 };
      expect(() => validateResponse(testSchema, data, { ...context, strict: true })).toThrowError(
        /\/api\/test/,
      );
    });
  });

  describe("lenient mode (prod)", () => {
    it("logs warning and returns raw data when invalid", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const data = { id: 123, name: "Alice" };

      const result = validateResponse(testSchema, data, { ...context, strict: false });

      expect(result).toStrictEqual({ id: 123, name: "Alice" });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain("testSchema");
    });

    it("includes URL in warning message", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const data = { bad: true };

      validateResponse(testSchema, data, { ...context, strict: false });

      expect(warnSpy.mock.calls[0][0]).toContain("/api/test");
    });

    it("limits issues to first 5 in warning", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const bigSchema = z.object({
        a: z.string(), b: z.string(), c: z.string(),
        d: z.string(), e: z.string(), f: z.string(),
        g: z.string(),
      });

      validateResponse(bigSchema, {}, { url: "/api/big", schemaName: "big", strict: false });

      const warningText = warnSpy.mock.calls[0][0] as string;
      expect(warningText).toContain("big");
    });
  });
});
