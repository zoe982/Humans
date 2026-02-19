import { describe, it, expect, vi } from "vitest";
import { ApiRequestError, extractApiError, extractApiErrorInfo, api } from "./api";

describe("ApiRequestError", () => {
  it("extends Error with structured fields", () => {
    const err = new ApiRequestError("Not found", "HUMAN_NOT_FOUND", "req-1", undefined, 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiRequestError");
    expect(err.message).toBe("Not found");
    expect(err.code).toBe("HUMAN_NOT_FOUND");
    expect(err.requestId).toBe("req-1");
    expect(err.status).toBe(404);
    expect(err.details).toBeUndefined();
  });

  it("includes details when provided", () => {
    const details = { name: ["required"] };
    const err = new ApiRequestError("Validation failed", "VALIDATION_FAILED", "req-2", details, 400);
    expect(err.details).toStrictEqual(details);
  });
});

describe("extractApiError", () => {
  it("returns error message from body", () => {
    expect(extractApiError({ error: "Something broke" }, "fallback")).toBe("Something broke");
  });

  it("returns fallback when body has no error", () => {
    expect(extractApiError({}, "fallback")).toBe("fallback");
  });

  it("returns fallback for non-object body", () => {
    expect(extractApiError(null, "fallback")).toBe("fallback");
    expect(extractApiError("string", "fallback")).toBe("fallback");
  });

  it("appends field error details", () => {
    const body = { error: "Validation failed", details: { name: ["required"], email: ["invalid"] } };
    const result = extractApiError(body, "fallback");
    expect(result).toContain("Validation failed");
    expect(result).toContain("name: required");
    expect(result).toContain("email: invalid");
  });

  it("handles empty details", () => {
    const body = { error: "Error", details: {} };
    expect(extractApiError(body, "fallback")).toBe("Error");
  });
});

describe("extractApiErrorInfo", () => {
  it("returns structured error info", () => {
    const body = { error: "Not found", code: "NOT_FOUND", requestId: "req-1" };
    const info = extractApiErrorInfo(body, "fallback");
    expect(info.message).toBe("Not found");
    expect(info.code).toBe("NOT_FOUND");
    expect(info.requestId).toBe("req-1");
  });

  it("uses fallback for missing error", () => {
    const info = extractApiErrorInfo({}, "fallback");
    expect(info.message).toBe("fallback");
  });
});

describe("api", () => {
  it("makes GET request and returns JSON", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [1, 2, 3] }),
    });

    const result = await api("/test", {}, mockFetch);
    expect(result).toStrictEqual({ data: [1, 2, 3] });
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8787/test");
    expect(opts.credentials).toBe("include");
  });

  it("appends query params", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await api("/search", { params: { q: "hello" } }, mockFetch);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:8787/search?q=hello");
  });

  it("throws ApiRequestError on non-ok response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found", code: "NOT_FOUND", requestId: "req-1" }),
    });

    await expect(api("/missing", {}, mockFetch)).rejects.toThrow(ApiRequestError);
    try {
      await api("/missing", {}, mockFetch);
    } catch (e) {
      const err = e as ApiRequestError;
      expect(err.status).toBe(404);
      expect(err.code).toBe("NOT_FOUND");
      expect(err.requestId).toBe("req-1");
    }
  });

  it("handles JSON parse failure in error response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("parse error");
      },
    });

    await expect(api("/bad", {}, mockFetch)).rejects.toThrow(ApiRequestError);
  });

  it("passes custom headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await api("/test", { headers: { "X-Custom": "val" } }, mockFetch);
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers["X-Custom"]).toBe("val");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("passes method and body for POST", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "1" }),
    });

    await api("/create", { method: "POST", body: JSON.stringify({ name: "test" }) }, mockFetch);
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe('{"name":"test"}');
  });

  it("handles Headers instance", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const headers = new Headers();
    headers.set("X-Test", "value");
    await api("/test", { headers }, mockFetch);
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const h = opts.headers as Record<string, string>;
    expect(h["X-Test"]).toBe("value");
  });

  it("handles array headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await api("/test", { headers: [["X-Arr", "val"]] }, mockFetch);
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const h = opts.headers as Record<string, string>;
    expect(h["X-Arr"]).toBe("val");
  });
});
