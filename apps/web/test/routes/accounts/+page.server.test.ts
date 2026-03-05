import { describe, it, expect, vi, afterEach } from "vitest";
import { isActionFailure, type ActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { actions } from "../../../src/routes/accounts/+page.server";

describe("accounts actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes an account and returns success", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1": { status: 200, body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "acc-1" } });
    const result = await actions.delete(event as any);

    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1": { status: 404, body: { error: "Account not found", code: "NOT_FOUND", requestId: "req-1" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "acc-1" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string; code?: string; requestId?: string }>;
    expect(failure.status).toBe(404);
    expect(failure.data.error).toBe("Account not found");
    expect(failure.data.code).toBe("NOT_FOUND");
    expect(failure.data.requestId).toBe("req-1");
  });

  it("uses fallback message when API returns no error field", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-2": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "acc-2" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string }>;
    expect(failure.status).toBe(500);
    expect(failure.data.error).toBe("Failed to delete account");
  });
});
