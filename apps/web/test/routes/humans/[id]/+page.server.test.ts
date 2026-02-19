import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/humans/[id]/+page.server";

const sampleHuman = {
  id: "h-1",
  firstName: "Jane",
  lastName: "Doe",
  emails: [],
  phoneNumbers: [],
  pets: [],
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "h-1" };
  return event;
}

describe("humans/[id] load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/humans/h-1": { body: { data: sampleHuman } },
      "/api/activities?humanId=h-1": { body: { data: [{ id: "a-1", type: "email" }] } },
      "/api/admin/account-config/human-email-labels": { body: { data: [{ id: "lbl-1" }] } },
      "/api/admin/account-config/human-phone-labels": { body: { data: [{ id: "plbl-1" }] } },
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

  it("returns human, activities, and label configs on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.human).toEqual(sampleHuman);
    expect(result.activities).toEqual([{ id: "a-1", type: "email" }]);
    expect(result.emailLabelConfigs).toEqual([{ id: "lbl-1" }]);
    expect(result.phoneLabelConfigs).toEqual([{ id: "plbl-1" }]);
  });

  it("redirects to /humans when human API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/humans/h-1": { status: 404, body: { error: "Not found" } },
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

describe("humans/[id] addActivity action", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on valid activity creation", async () => {
    const event = makeEvent({
      formData: {
        type: "email",
        subject: "Follow up",
        activityDate: "2025-01-15",
      },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API errors", async () => {
    mockFetch = createMockFetch({
      "/api/activities": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { type: "email", subject: "Test" },
    });
    const result = await actions.addActivity(event as any);
    expect(isActionFailure(result)).toBe(true);
  });

  it("creates geo-interest expression when geo fields present", async () => {
    mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
      "/api/geo-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: {
        type: "meeting",
        subject: "Discuss trip",
        activityDate: "2025-01-15",
        geoCity: "Rome",
        geoCountry: "Italy",
      },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("geo-interest-expressions"))).toBe(true);
  });
});

describe("humans/[id] unlinkSignup action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on unlink", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/route-signups/link-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { linkId: "link-1" } });
    const result = await actions.unlinkSignup(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API errors", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/route-signups/link-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { linkId: "link-1" } });
    const result = await actions.unlinkSignup(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] addEmail action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when email is added", async () => {
    const mockFetch = createMockFetch({
      "/api/emails": { body: { data: { id: "em-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { email: "jane@work.com", labelId: "lbl-1" },
    });
    const result = await actions.addEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/emails": { status: 422, body: { error: "Invalid email" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { email: "bad" } });
    const result = await actions.addEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] deleteEmail action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/emails/em-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "em-1" } });
    const result = await actions.deleteEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/emails/em-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "em-1" } });
    const result = await actions.deleteEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] addPhoneNumber action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when phone number is added", async () => {
    const mockFetch = createMockFetch({
      "/api/phone-numbers": { body: { data: { id: "ph-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { phoneNumber: "+1234567890", labelId: "plbl-1" },
    });
    const result = await actions.addPhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/phone-numbers": { status: 422, body: { error: "Invalid phone" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumber: "bad" } });
    const result = await actions.addPhoneNumber(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] deletePhoneNumber action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/phone-numbers/ph-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneId: "ph-1" } });
    const result = await actions.deletePhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });
});

describe("humans/[id] addGeoInterestExpression action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success with geoInterestId", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { geoInterestId: "gi-1", notes: "Very interested" },
    });
    const result = await actions.addGeoInterestExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns success with city/country when no geoInterestId", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { city: "Rome", country: "Italy" },
    });
    const result = await actions.addGeoInterestExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions": { status: 400, body: { error: "Missing data" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { geoInterestId: "gi-1" } });
    const result = await actions.addGeoInterestExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] deleteGeoInterestExpression action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "expr-1" } });
    const result = await actions.deleteGeoInterestExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "expr-1" } });
    const result = await actions.deleteGeoInterestExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] addPet action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when pet is added", async () => {
    const mockFetch = createMockFetch({
      "/api/pets": { body: { data: { id: "pet-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { name: "Buddy", breed: "Labrador", weight: "30" },
    });
    const result = await actions.addPet(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/pets": { status: 422, body: { error: "Name required" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { name: "" } });
    const result = await actions.addPet(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});
