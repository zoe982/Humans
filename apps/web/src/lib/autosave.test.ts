import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the api module before importing autosave
vi.mock("$lib/api", () => ({
  api: vi.fn(),
  ApiRequestError: class ApiRequestError extends Error {
    constructor(
      message: string,
      public readonly code: string | undefined,
      public readonly requestId: string | undefined,
      public readonly details: Record<string, string[]> | undefined,
      public readonly status: number,
    ) {
      super(message);
      this.name = "ApiRequestError";
    }
  },
}));

import { createAutoSaver } from "./autosave";
import { api, ApiRequestError } from "$lib/api";

const mockApi = vi.mocked(api);

describe("createAutoSaver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockApi.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns object with init, save, saveImmediate, destroy", () => {
    const saver = createAutoSaver({ endpoint: "/api/test" });
    expect(typeof saver.init).toBe("function");
    expect(typeof saver.save).toBe("function");
    expect(typeof saver.saveImmediate).toBe("function");
    expect(typeof saver.destroy).toBe("function");
  });

  it("debounces save calls", () => {
    mockApi.mockResolvedValue({ data: {} });
    const onStatusChange = vi.fn();
    const saver = createAutoSaver({ endpoint: "/api/test", debounceMs: 500, onStatusChange });
    saver.init({});

    saver.save({ name: "a" });
    saver.save({ name: "b" });
    saver.save({ name: "c" });

    expect(mockApi).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(mockApi).toHaveBeenCalledOnce();
  });

  it("calls onStatusChange with saving then saved", async () => {
    mockApi.mockResolvedValue({ data: {} });
    const onStatusChange = vi.fn();
    const saver = createAutoSaver({ endpoint: "/api/test", debounceMs: 100, onStatusChange });
    saver.init({});

    saver.save({ name: "test" });
    vi.advanceTimersByTime(100);

    // Let the async save complete
    await vi.runAllTimersAsync();

    expect(onStatusChange).toHaveBeenCalledWith("saving");
    expect(onStatusChange).toHaveBeenCalledWith("saved");
  });

  it("saveImmediate bypasses debounce", () => {
    mockApi.mockResolvedValue({ data: {} });
    const saver = createAutoSaver({ endpoint: "/api/test", debounceMs: 5000 });
    saver.init({});

    saver.saveImmediate({ name: "now" });
    expect(mockApi).toHaveBeenCalledOnce();
  });

  it("destroy cancels pending timer", () => {
    mockApi.mockResolvedValue({ data: {} });
    const saver = createAutoSaver({ endpoint: "/api/test", debounceMs: 1000 });
    saver.init({});

    saver.save({ name: "test" });
    saver.destroy();
    vi.advanceTimersByTime(1000);

    expect(mockApi).not.toHaveBeenCalled();
  });

  it("calls onError on API failure", async () => {
    mockApi.mockRejectedValue(new Error("Network error"));
    const onError = vi.fn();
    const onStatusChange = vi.fn();
    const saver = createAutoSaver({ endpoint: "/api/test", debounceMs: 0, onStatusChange, onError });
    saver.init({});

    saver.save({ name: "fail" });
    await vi.runAllTimersAsync();

    expect(onStatusChange).toHaveBeenCalledWith("error");
    expect(onError).toHaveBeenCalledWith("Network error");
  });

  it("calls onError with structured info for ApiRequestError", async () => {
    const apiErr = new ApiRequestError("Validation failed", "VALIDATION_FAILED", "req-1", undefined, 400);
    mockApi.mockRejectedValue(apiErr);
    const onError = vi.fn();
    const saver = createAutoSaver({ endpoint: "/api/test", debounceMs: 0, onError });
    saver.init({});

    saver.save({ name: "fail" });
    await vi.runAllTimersAsync();

    expect(onError).toHaveBeenCalledWith("Validation failed", {
      message: "Validation failed",
      code: "VALIDATION_FAILED",
      requestId: "req-1",
    });
  });

  it("calls onSaved with auditEntryId", async () => {
    mockApi.mockResolvedValue({ auditEntryId: "audit-1" });
    const onSaved = vi.fn();
    const saver = createAutoSaver({ endpoint: "/api/test", debounceMs: 0, onSaved });
    saver.init({});

    saver.save({ name: "test" });
    await vi.runAllTimersAsync();

    expect(onSaved).toHaveBeenCalledWith({ auditEntryId: "audit-1" });
  });

  it("saveImmediate clears pending debounce timer", () => {
    mockApi.mockResolvedValue({ data: {} });
    const saver = createAutoSaver({ endpoint: "/api/test", debounceMs: 1000 });
    saver.init({});

    saver.save({ name: "debounced" });
    saver.saveImmediate({ name: "immediate" });
    vi.advanceTimersByTime(1000);

    // Only the immediate call should have fired, not the debounced one
    expect(mockApi).toHaveBeenCalledOnce();
  });
});
