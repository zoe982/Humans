import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load } from "../../../../src/routes/marketing-attributions/[id]/+page.server";

const sampleAttribution = {
  id: "mat-1",
  crmDisplayId: "MAT-AAA-001",
  createdAt: "2026-01-15T10:00:00.000Z",
  ftUtmSource: "google",
  ltUtmSource: "facebook",
  linkedLead: null,
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "mat-1" };
  return event;
}

describe("marketing-attributions/[id] load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/marketing-attributions/mat-1": { body: { data: sampleAttribution } },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login when user is null", async () => {
    const event = makeEvent({ user: null });
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns attribution and user on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.attribution).toEqual(sampleAttribution);
    expect(result.user).toBeDefined();
  });

  it("redirects to /marketing-attributions when API returns 404", async () => {
    mockFetch = createMockFetch({
      "/api/marketing-attributions/mat-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("redirects when API returns non-object data", async () => {
    mockFetch = createMockFetch({
      "/api/marketing-attributions/mat-1": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });
});
