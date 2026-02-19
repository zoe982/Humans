import { describe, it, expect, vi } from "vitest";
import { handleError } from "./hooks.client";

describe("handleError (client)", () => {
  it("returns error message from Error instance", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = handleError({ error: new Error("client error"), event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("client error");
    consoleSpy.mockRestore();
  });

  it("returns stringified message for non-Error", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = handleError({ error: "raw string", event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("raw string");
    consoleSpy.mockRestore();
  });

  it("returns fallback message when error has no message", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = handleError({ error: new Error(""), event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("An unexpected error occurred");
    consoleSpy.mockRestore();
  });

  it("logs error to console.error as JSON", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    handleError({ error: new Error("test"), event: {} as never, status: 500, message: "" });
    expect(consoleSpy).toHaveBeenCalledOnce();
    const logArg = consoleSpy.mock.calls[0][1] as string;
    const parsed = JSON.parse(logArg) as Record<string, unknown>;
    expect(parsed.message).toBe("test");
    consoleSpy.mockRestore();
  });
});
