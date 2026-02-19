import { describe, it, expect, vi } from "vitest";
import { logInfo, logWarn, logError } from "../../src/lib/logger";

describe("logInfo", () => {
  it("outputs JSON to console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logInfo("test message");
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
    expect(parsed.timestamp).toBeDefined();
    spy.mockRestore();
  });

  it("includes extra fields", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logInfo("msg", { requestId: "req-1", method: "GET" });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(parsed.requestId).toBe("req-1");
    expect(parsed.method).toBe("GET");
    spy.mockRestore();
  });
});

describe("logWarn", () => {
  it("outputs JSON to console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logWarn("warning");
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(parsed.level).toBe("warn");
    expect(parsed.message).toBe("warning");
    spy.mockRestore();
  });
});

describe("logError", () => {
  it("outputs JSON to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logError("error occurred", { code: "ERR_TEST", status: 500 });
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(parsed.level).toBe("error");
    expect(parsed.message).toBe("error occurred");
    expect(parsed.code).toBe("ERR_TEST");
    expect(parsed.status).toBe(500);
    spy.mockRestore();
  });
});
