import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load, actions } from "../../../../../src/routes/leads/route-signups/[id]/+page.server";

const sampleSignup = {
  id: "rs-1",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  status: "new",
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "rs-1" };
  return event;
}

describe("route-signups/[id] load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: sampleSignup } },
      "/api/activities?routeSignupId=rs-1": { body: { data: [{ id: "a-1", type: "email" }] } },
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

  it("returns signup, activities, marketingAttribution, and user on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.signup).toEqual(sampleSignup);
    expect(result.activities).toEqual([{ id: "a-1", type: "email" }]);
    expect(result.marketingAttribution).toBeNull();
    expect(result.user).toBeDefined();
  });

  it("redirects to /leads/route-signups when signup API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { status: 404, body: { error: "Not found" } },
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

  it("fetches marketing attribution when signup has marketing_attribution_id", async () => {
    const signupWithAttr = { ...sampleSignup, marketing_attribution_id: "mat-1" };
    const sampleAttr = { id: "mat-1", crmDisplayId: "MAT-AAA-001" };
    mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: signupWithAttr } },
      "/api/activities?routeSignupId=rs-1": { body: { data: [] } },
      "/api/marketing-attributions/mat-1": { body: { data: sampleAttr } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.marketingAttribution).toEqual(sampleAttr);
  });

  it("returns leadScore when lead-scores API returns data", async () => {
    const sampleScore = { id: "sco-1", scoreTotal: 45, scoreFit: 30, scoreIntent: 5, scoreEngagement: 15, scoreNegative: 5 };
    mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: sampleSignup } },
      "/api/activities?routeSignupId=rs-1": { body: { data: [] } },
      "/api/lead-scores/by-parent/route_signup/rs-1": { body: { data: sampleScore } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.leadScore).toEqual(sampleScore);
  });

  it("returns null leadScore when lead-scores API returns null data", async () => {
    mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: sampleSignup } },
      "/api/activities?routeSignupId=rs-1": { body: { data: [] } },
      "/api/lead-scores/by-parent/route_signup/rs-1": { body: { data: null } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.leadScore).toBeNull();
  });

  it("returns empty activities when activities API fails", async () => {
    mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: sampleSignup } },
      "/api/activities?routeSignupId=rs-1": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.signup).toEqual(sampleSignup);
    expect(result.activities).toEqual([]);
  });
});

describe("route-signups/[id] updateStatus action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on status update", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { status: "contacted" } });
    const result = await actions.updateStatus(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { status: 400, body: { error: "Invalid status" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { status: "bad" } });
    const result = await actions.updateStatus(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] updateNote action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on note update", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { note: "Called and left voicemail" } });
    const result = await actions.updateNote(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { note: "test" } });
    const result = await actions.updateNote(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] delete action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /leads/route-signups on successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await actions.delete(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] addActivity action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on activity creation", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: {
        type: "email",
        subject: "Initial outreach",
        activityDate: "2025-01-15",
      },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { type: "email", subject: "Test" },
    });
    const result = await actions.addActivity(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] convertToHuman action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on conversion", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/convert-from-signup": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { humanId: "h-1" } });
    const result = await actions.convertToHuman(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/convert-from-signup": { status: 400, body: { error: "Already converted" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { humanId: "h-1" } });
    const result = await actions.convertToHuman(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Already converted");
    }
  });
});

describe("route-signups/[id] addEmail action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when email is added", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1/emails": { body: { data: { id: "eml-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { email: "new@example.com" } });
    const result = await actions.addEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1/emails": { status: 422, body: { error: "Invalid email" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { email: "bad" } });
    const result = await actions.addEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] deleteEmail action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when email is deleted", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1/emails/eml-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { emailId: "eml-1" } });
    const result = await actions.deleteEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1/emails/eml-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { emailId: "eml-1" } });
    const result = await actions.deleteEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] addPhoneNumber action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when phone number is added", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1/phone-numbers": { body: { data: { id: "fon-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumber: "+15551234567" } });
    const result = await actions.addPhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1/phone-numbers": { status: 422, body: { error: "Invalid phone" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumber: "bad" } });
    const result = await actions.addPhoneNumber(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] deletePhoneNumber action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when phone number is deleted", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1/phone-numbers/fon-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumberId: "fon-1" } });
    const result = await actions.deletePhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1/phone-numbers/fon-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumberId: "fon-1" } });
    const result = await actions.deletePhoneNumber(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] addSocialId action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when social ID is added", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1/social-ids": { body: { data: { id: "soc-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { handle: "@user", platformId: "plat-1" } });
    const result = await actions.addSocialId(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1/social-ids": { status: 422, body: { error: "Handle required" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { handle: "", platformId: "plat-1" } });
    const result = await actions.addSocialId(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] deleteSocialId action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when social ID is deleted", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1/social-ids/soc-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { socialIdId: "soc-1" } });
    const result = await actions.deleteSocialId(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1/social-ids/soc-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { socialIdId: "soc-1" } });
    const result = await actions.deleteSocialId(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] updateSourceChannel action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when source/channel are updated", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { source: "Meta Ads", channel: "WhatsApp" } });
    const result = await actions.updateSourceChannel(event as any);
    expect(result).toEqual({ success: true });
  });

  it("sends null for empty source/channel", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { source: "", channel: "" } });
    const result = await actions.updateSourceChannel(event as any);
    expect(result).toEqual({ success: true });

    const patchCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "PATCH",
    );
    const body = JSON.parse((patchCall as unknown[])[1]
      ? ((patchCall as unknown[])[1] as RequestInit).body as string
      : "{}") as { crm_source: unknown; crm_channel: unknown };
    expect(body.crm_source).toBeNull();
    expect(body.crm_channel).toBeNull();
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { source: "Google", channel: "Email" } });
    const result = await actions.updateSourceChannel(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] load returns leadSources and leadChannels", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns leadSources and leadChannels from config", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: sampleSignup } },
      "/api/activities?routeSignupId=rs-1": { body: { data: [] } },
      "account-config/batch": {
        body: {
          data: {
            "social-id-platforms": [],
            "lead-sources": [{ id: "ls1", name: "Google Ads", createdAt: "2025-01-01" }],
            "lead-channels": [{ id: "lc1", name: "Email", createdAt: "2025-01-01" }],
          },
        },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.leadSources).toEqual([{ id: "ls1", name: "Google Ads", createdAt: "2025-01-01" }]);
    expect(result.leadChannels).toEqual([{ id: "lc1", name: "Email", createdAt: "2025-01-01" }]);
  });
});
