import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to mock $app/environment before importing the module
vi.mock("$app/environment", () => ({ browser: true }));

let recordError: typeof import("$lib/client-diagnostics").recordError;
let getCapturedErrors: typeof import("$lib/client-diagnostics").getCapturedErrors;
let buildDiagnosticReport: typeof import("$lib/client-diagnostics").buildDiagnosticReport;

describe("client-diagnostics", () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    sendBeaconSpy = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { sendBeacon: sendBeaconSpy, userAgent: "test-ua" });
    vi.stubGlobal("window", { location: { href: "https://test.app/accounts/123" } });

    const mod = await import("$lib/client-diagnostics");
    recordError = mod.recordError;
    getCapturedErrors = mod.getCapturedErrors;
    buildDiagnosticReport = mod.buildDiagnosticReport;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("records errors in memory", () => {
    recordError("Test error", "Error\n  at test.js:1", "test-source");

    const errors = getCapturedErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      message: "Test error",
      stack: "Error\n  at test.js:1",
      source: "test-source",
    });
  });

  it("caps stored errors at 20", () => {
    for (let i = 0; i < 25; i++) {
      recordError(`Error ${String(i)}`);
    }
    expect(getCapturedErrors()).toHaveLength(20);
  });

  it("sends errors to /api/client-errors via sendBeacon after flush delay", () => {
    vi.useFakeTimers();

    recordError("Crash happened", "Error\n  at page.svelte:42", "window.onerror");

    // Not sent immediately
    expect(sendBeaconSpy).not.toHaveBeenCalled();

    // After flush delay
    vi.advanceTimersByTime(2000);

    expect(sendBeaconSpy).toHaveBeenCalledOnce();
    const [url, payload] = sendBeaconSpy.mock.calls[0] as [string, string];
    expect(url).toBe("/api/client-errors");

    const body = JSON.parse(payload) as { message: string; url: string; errors: { type: string; message: string; stack: string }[] };
    expect(body.message).toContain("Crash happened");
    expect(body.url).toBe("https://test.app/accounts/123");
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]!.type).toBe("window.onerror");
    expect(body.errors[0]!.message).toBe("Crash happened");
    expect(body.errors[0]!.stack).toContain("page.svelte:42");
  });

  it("deduplicates errors with the same message", () => {
    vi.useFakeTimers();

    recordError("Same error");
    recordError("Same error");
    recordError("Same error");

    vi.advanceTimersByTime(2000);

    expect(sendBeaconSpy).toHaveBeenCalledOnce();
    const payload = JSON.parse(sendBeaconSpy.mock.calls[0]![1] as string) as { errors: unknown[] };
    // Only 1 error sent despite 3 recorded (deduplication by message)
    expect(payload.errors).toHaveLength(1);
  });

  it("batches multiple different errors in a single request", () => {
    vi.useFakeTimers();

    recordError("Error A");
    recordError("Error B");
    recordError("Error C");

    vi.advanceTimersByTime(2000);

    expect(sendBeaconSpy).toHaveBeenCalledOnce();
    const payload = JSON.parse(sendBeaconSpy.mock.calls[0]![1] as string) as { errors: unknown[] };
    expect(payload.errors).toHaveLength(3);
  });

  it("falls back to fetch when sendBeacon is unavailable", async () => {
    vi.useFakeTimers();

    const fetchSpy = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("navigator", { sendBeacon: undefined, userAgent: "test-ua" });
    vi.stubGlobal("fetch", fetchSpy);

    // Re-import to get fresh module with no sendBeacon
    vi.resetModules();
    const mod = await import("$lib/client-diagnostics");
    mod.recordError("Fallback error");

    vi.advanceTimersByTime(2000);

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0]![0]).toBe("/api/client-errors");
  });

  it("builds diagnostic report with captured errors", () => {
    recordError("Error 1", "stack1", "source1");
    recordError("Error 2", undefined, "source2");

    const report = buildDiagnosticReport("Test reason");

    expect(report).toContain("BLANK PAGE DETECTED: Test reason");
    expect(report).toContain("https://test.app/accounts/123");
    expect(report).toContain("Error 1");
    expect(report).toContain("Error 2");
    expect(report).toContain("source1");
  });
});
