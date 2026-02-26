import { describe, it, expect } from "vitest";
import {
  paginationMetaSchema,
  listResponse,
  detailResponse,
  successResponseSchema,
} from "./wrappers";
import { z } from "zod";

describe("paginationMetaSchema", () => {
  it("accepts valid pagination meta", () => {
    const result = paginationMetaSchema.parse({ page: 1, limit: 25, total: 100 });
    expect(result).toStrictEqual({ page: 1, limit: 25, total: 100 });
  });

  it("rejects missing page field", () => {
    expect(() => paginationMetaSchema.parse({ limit: 25, total: 100 })).toThrowError();
  });

  it("rejects missing limit field", () => {
    expect(() => paginationMetaSchema.parse({ page: 1, total: 100 })).toThrowError();
  });

  it("rejects missing total field", () => {
    expect(() => paginationMetaSchema.parse({ page: 1, limit: 25 })).toThrowError();
  });

  it("rejects non-number values", () => {
    expect(() => paginationMetaSchema.parse({ page: "1", limit: 25, total: 100 })).toThrowError();
  });
});

describe("listResponse", () => {
  const itemSchema = z.object({ id: z.string(), name: z.string() });

  it("accepts valid list response with data array and meta", () => {
    const schema = listResponse(itemSchema);
    const result = schema.parse({
      data: [{ id: "1", name: "Alice" }],
      meta: { page: 1, limit: 25, total: 1 },
    });
    expect(result.data).toStrictEqual([{ id: "1", name: "Alice" }]);
    expect(result.meta).toStrictEqual({ page: 1, limit: 25, total: 1 });
  });

  it("accepts empty data array", () => {
    const schema = listResponse(itemSchema);
    const result = schema.parse({
      data: [],
      meta: { page: 1, limit: 25, total: 0 },
    });
    expect(result.data).toStrictEqual([]);
  });

  it("rejects when data is not an array", () => {
    const schema = listResponse(itemSchema);
    expect(() => schema.parse({ data: "not-array", meta: { page: 1, limit: 25, total: 0 } })).toThrowError();
  });

  it("rejects when meta is missing", () => {
    const schema = listResponse(itemSchema);
    expect(() => schema.parse({ data: [] })).toThrowError();
  });

  it("rejects when items fail item schema", () => {
    const schema = listResponse(itemSchema);
    expect(() => schema.parse({
      data: [{ id: 123, name: "Alice" }],
      meta: { page: 1, limit: 25, total: 1 },
    })).toThrowError();
  });
});

describe("detailResponse", () => {
  const itemSchema = z.object({ id: z.string(), name: z.string() });

  it("accepts valid detail response", () => {
    const schema = detailResponse(itemSchema);
    const result = schema.parse({ data: { id: "1", name: "Alice" } });
    expect(result.data).toStrictEqual({ id: "1", name: "Alice" });
  });

  it("rejects when data is missing", () => {
    const schema = detailResponse(itemSchema);
    expect(() => schema.parse({})).toThrowError();
  });

  it("rejects when data fails item schema", () => {
    const schema = detailResponse(itemSchema);
    expect(() => schema.parse({ data: { id: 123, name: "Alice" } })).toThrowError();
  });
});

describe("successResponseSchema", () => {
  it("accepts { success: true }", () => {
    const result = successResponseSchema.parse({ success: true });
    expect(result).toStrictEqual({ success: true });
  });

  it("rejects { success: false }", () => {
    expect(() => successResponseSchema.parse({ success: false })).toThrowError();
  });

  it("rejects missing success field", () => {
    expect(() => successResponseSchema.parse({})).toThrowError();
  });
});
