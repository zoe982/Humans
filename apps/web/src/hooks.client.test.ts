import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleError } from "./hooks.client";

describe("handleError (client)", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("returns error message from Error instance", () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const result = handleError({ error: new Error("client error"), event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("client error");
  });

  it("returns stringified message for non-Error string", () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const result = handleError({ error: "raw string", event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("raw string");
  });

  it("returns fallback message when error has no message", () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const result = handleError({ error: new Error(""), event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("An unexpected error occurred");
  });

  it("describes SvelteKit Redirect objects with status and location", () => {
    const redirectObj = { status: 302, location: "/login" };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const result = handleError({ error: redirectObj, event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("Redirect(302, /login)");
  });

  it("describes SvelteKit HttpError objects with status and body", () => {
    const httpError = { status: 404, body: { message: "Not found" } };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const result = handleError({ error: httpError, event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe('HttpError(404, {"message":"Not found"})');
  });

  it("JSON-serializes unknown plain objects instead of [object Object]", () => {
    const plainObj = { code: "SOME_ERROR", detail: "something broke" };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const result = handleError({ error: plainObj, event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe('{"code":"SOME_ERROR","detail":"something broke"}');
  });

  it("falls back to String() for objects that cannot be JSON-serialized", () => {
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const result = handleError({ error: circular, event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("[object Object]");
  });

  it("logs error to console.error as JSON", () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    void handleError({ error: new Error("test"), event: {} as never, status: 500, message: "" });
    expect(consoleSpy).toHaveBeenCalledOnce();
    const calls = consoleSpy.mock.calls;
    const firstCall = calls[0];
    const logArg = firstCall !== undefined && firstCall.length > 1 ? firstCall[1] : undefined;
    const logArgStr = typeof logArg === "string" ? logArg : "";
    const parsed: unknown = JSON.parse(logArgStr) as unknown;
    const message = typeof parsed === "object" && parsed !== null && "message" in parsed ? (parsed as { message: unknown }).message : undefined;
    expect(message).toBe("test");
  });
});
