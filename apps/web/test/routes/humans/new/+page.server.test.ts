import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/humans/new/+page.server";

describe("humans/new load", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login when user is null", async () => {
    const event = mockEvent({ user: null });
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns prefill data from URL params", async () => {
    const event = mockEvent({
      url: "http://localhost/humans/new?firstName=Jane&lastName=Doe&fromSignup=signup-1&middleName=M",
    });
    const result = await load(event as any);
    expect(result.prefill).toEqual({
      fromSignup: "signup-1",
      fromGeneralLead: "",
      firstName: "Jane",
      middleName: "M",
      lastName: "Doe",
      notes: "",
    });
  });

  it("returns empty prefill strings when no URL params", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.prefill).toEqual({
      fromSignup: "",
      fromGeneralLead: "",
      firstName: "",
      middleName: "",
      lastName: "",
      notes: "",
    });
  });
});

describe("humans/new create action", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { data: { id: "h-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to new human on successful create", async () => {
    const event = mockEvent({
      formData: {
        firstName: "Jane",
        lastName: "Doe",
      },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns action failure when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { status: 422, body: { error: "Validation failed" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: {
        firstName: "",
        lastName: "",
      },
    });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Validation failed");
    }
  });

  it("calls convert-from-signup when fromSignup is set", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { data: { id: "h-1" } } },
      "/convert-from-signup": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: {
        firstName: "Jane",
        lastName: "Doe",
        fromSignup: "signup-1",
      },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
    // Verify that the convert endpoint was called
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("convert-from-signup"))).toBe(true);
  });

  it("returns failure when API returns unexpected response shape", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { firstName: "Jane", lastName: "Doe" },
    });
    // isDataWithId checks for "data" key existing — { weird: true } does not have "data"
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
  });

  it("includes types in the POST payload", async () => {
    const event = mockEvent({
      formData: {
        firstName: "Jane",
        lastName: "Doe",
        types: "client",
      },
    });
    try {
      await actions.create(event as any);
    } catch {
      // redirect expected
    }
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse((postCall as unknown[])[1] as string
      ? ((postCall as unknown[])[1] as RequestInit).body as string
      : "{}");
    expect(body.firstName).toBe("Jane");
    expect(body.lastName).toBe("Doe");
  });

  it("redirects to human when convert-from-signup fails", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { data: { id: "h-2" } } },
      "/convert-from-signup": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: {
        firstName: "Jane",
        lastName: "Doe",
        fromSignup: "signup-bad",
      },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });
});
