import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  fetchList,
  fetchObj,
  isListData,
  isObjData,
  authHeaders,
} from "$lib/server/api";

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
}).passthrough();

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("isListData", () => {
  it("returns true for valid list wrapper", () => {
    expect(isListData({ data: [{ id: "1" }] })).toBe(true);
  });

  it("returns false for non-array data", () => {
    expect(isListData({ data: "not-array" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isListData(null)).toBe(false);
  });
});

describe("isObjData", () => {
  it("returns true for valid object wrapper", () => {
    expect(isObjData({ data: { id: "1" } })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isObjData(null)).toBe(false);
  });
});

describe("authHeaders", () => {
  it("returns cookie header with session token", () => {
    expect(authHeaders("my-token")).toStrictEqual({ Cookie: "humans_session=my-token" });
  });
});

describe("fetchList", () => {
  it("returns data array without schema (backward compatible)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ id: "1", name: "Alice" }], meta: { page: 1, limit: 25, total: 1 } })),
    ));

    const result = await fetchList("http://api/humans", "token");
    expect(result).toStrictEqual([{ id: "1", name: "Alice" }]);
  });

  it("returns empty array on non-ok response without schema", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("error", { status: 500 }),
    ));

    const result = await fetchList("http://api/humans", "token");
    expect(result).toStrictEqual([]);
  });

  it("returns validated data when schema is provided", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ id: "1", name: "Alice" }], meta: { page: 1, limit: 25, total: 1 } })),
    ));

    const result = await fetchList("http://api/humans", "token", {
      schema: itemSchema,
      schemaName: "testItem",
    });
    expect(result).toStrictEqual([{ id: "1", name: "Alice" }]);
  });

  it("returns empty array on non-ok response with schema", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("error", { status: 404 }),
    ));

    const result = await fetchList("http://api/humans", "token", {
      schema: itemSchema,
      schemaName: "testItem",
    });
    expect(result).toStrictEqual([]);
  });

  it("returns empty array when json parsing fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("not-json", { status: 200 }),
    ));

    const result = await fetchList("http://api/humans", "token");
    expect(result).toStrictEqual([]);
  });
});

describe("fetchObj", () => {
  it("returns data object without schema (backward compatible)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ data: { id: "1", name: "Alice" } })),
    ));

    const result = await fetchObj("http://api/humans/1", "token");
    expect(result).toStrictEqual({ id: "1", name: "Alice" });
  });

  it("returns null on non-ok response without schema", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("error", { status: 404 }),
    ));

    const result = await fetchObj("http://api/humans/1", "token");
    expect(result).toBeNull();
  });

  it("returns validated data when schema is provided", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ data: { id: "1", name: "Alice" } })),
    ));

    const result = await fetchObj("http://api/humans/1", "token", {
      schema: itemSchema,
      schemaName: "testItem",
    });
    expect(result).toStrictEqual({ id: "1", name: "Alice" });
  });

  it("returns null on non-ok response with schema", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("error", { status: 500 }),
    ));

    const result = await fetchObj("http://api/humans/1", "token", {
      schema: itemSchema,
      schemaName: "testItem",
    });
    expect(result).toBeNull();
  });

  it("returns null when json parsing fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("not-json", { status: 200 }),
    ));

    const result = await fetchObj("http://api/humans/1", "token");
    expect(result).toBeNull();
  });
});
