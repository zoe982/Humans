import { describe, it, expect } from "vitest";
import { formatErrorForClipboard } from "./error-format";

/** Minimal valid ErrorEntry with all nullable fields set to benign defaults. */
function makeEntry(overrides: Partial<Parameters<typeof formatErrorForClipboard>[0]> = {}) {
  return {
    displayId: "ERR-001",
    code: "INTERNAL_ERROR",
    status: 500,
    message: "Something went wrong",
    method: "GET",
    path: "/api/humans",
    createdAt: "2026-02-21T12:00:00Z",
    requestId: "req-abc123",
    userId: "user-1",
    details: null,
    stack: null,
    resolutionStatus: "open",
    ...overrides,
  };
}

describe("formatErrorForClipboard", () => {
  it("includes all base fields in the output", () => {
    const result = formatErrorForClipboard(makeEntry());
    expect(result).toContain("Error: ERR-001");
    expect(result).toContain("Code: INTERNAL_ERROR");
    expect(result).toContain("HTTP Status: 500");
    expect(result).toContain("Message: Something went wrong");
    expect(result).toContain("Path: GET /api/humans");
    expect(result).toContain("Time: 2026-02-21T12:00:00Z");
    expect(result).toContain("Request ID: req-abc123");
    expect(result).toContain("User ID: user-1");
  });

  it('shows "—" for User ID when userId is null', () => {
    const result = formatErrorForClipboard(makeEntry({ userId: null }));
    expect(result).toContain("User ID: —");
  });

  it("shows an empty Path line when both method and path are null", () => {
    // template: `Path: ${method ?? ""} ${path ?? ""}`.trim() — yields "Path:" when both null
    const result = formatErrorForClipboard(makeEntry({ method: null, path: null }));
    const lines = result.split("\n");
    expect(lines.some((l) => l === "Path:")).toBe(true);
  });

  it("includes the path in the Path line when method is null but path is set", () => {
    const result = formatErrorForClipboard(makeEntry({ method: null, path: "/api/humans" }));
    expect(result).toContain("/api/humans");
  });

  it("omits path from path line when path is null but method is set", () => {
    const result = formatErrorForClipboard(makeEntry({ method: "POST", path: null }));
    expect(result).toContain("Path: POST");
  });

  it("does not include a Details section when details is null", () => {
    const result = formatErrorForClipboard(makeEntry({ details: null }));
    expect(result).not.toContain("Details:");
  });

  it("serializes JSON-serializable details with pretty-printing", () => {
    const details = { field: "email", reason: "invalid format" };
    const result = formatErrorForClipboard(makeEntry({ details }));
    expect(result).toContain("Details:");
    expect(result).toContain(JSON.stringify(details, null, 2));
  });

  it("falls back to String() when details is not JSON-serializable", () => {
    // A circular reference cannot be JSON.stringify'd
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    const result = formatErrorForClipboard(makeEntry({ details: circular }));
    expect(result).toContain("Details:");
    expect(result).toContain(String(circular));
  });

  it("does not include a Stack Trace section when stack is null", () => {
    const result = formatErrorForClipboard(makeEntry({ stack: null }));
    expect(result).not.toContain("Stack Trace:");
  });

  it("includes the stack trace when stack is provided", () => {
    const stack = "Error: boom\n  at fn (file.ts:10:5)";
    const result = formatErrorForClipboard(makeEntry({ stack }));
    expect(result).toContain("Stack Trace:");
    expect(result).toContain(stack);
  });

  it('shows "Open" when resolutionStatus is not "resolved"', () => {
    const result = formatErrorForClipboard(makeEntry({ resolutionStatus: "open" }));
    expect(result).toContain("Resolution: Open");
  });

  it('shows "Resolved" when resolutionStatus is "resolved"', () => {
    const result = formatErrorForClipboard(makeEntry({ resolutionStatus: "resolved" }));
    expect(result).toContain("Resolution: Resolved");
  });

  it("joins all sections with newlines", () => {
    const result = formatErrorForClipboard(makeEntry());
    // A well-formed output has multiple newline-separated lines
    const lines = result.split("\n");
    expect(lines.length).toBeGreaterThan(5);
  });
});
