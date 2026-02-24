import { describe, it, expect, vi } from "vitest";
import { handleError } from "./hooks.client";

describe("handleError (client)", () => {
  it("returns error message from Error instance", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const result = handleError({ error: new Error("client error"), event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("client error");
    consoleSpy.mockRestore();
  });

  it("returns stringified message for non-Error", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const result = handleError({ error: "raw string", event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("raw string");
    consoleSpy.mockRestore();
  });

  it("returns fallback message when error has no message", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const result = handleError({ error: new Error(""), event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("An unexpected error occurred");
    consoleSpy.mockRestore();
  });

  it("logs error to console.error as JSON", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    void handleError({ error: new Error("test"), event: {} as never, status: 500, message: "" });
    expect(consoleSpy).toHaveBeenCalledOnce();
    const calls = consoleSpy.mock.calls;
    const firstCall = calls[0];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const logArg = firstCall !== undefined && firstCall.length > 1 ? firstCall[1] : undefined;
    const logArgStr = typeof logArg === "string" ? logArg : "";
    const parsed: unknown = JSON.parse(logArgStr) as unknown;
    const message = typeof parsed === "object" && parsed !== null && "message" in parsed ? (parsed as { message: unknown }).message : undefined;
    expect(message).toBe("test");
    consoleSpy.mockRestore();
  });
});
