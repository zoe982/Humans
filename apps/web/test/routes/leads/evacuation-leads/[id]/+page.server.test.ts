import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load, actions } from "../../../../../src/routes/leads/evacuation-leads/[id]/+page.server";

const sampleLead = {
  id: "eva-1",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  status: "open",
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "eva-1" };
  return event;
}

function defaultMockFetch() {
  return createMockFetch({
    "/api/evacuation-leads/eva-1": { body: { data: sampleLead } },
    "/api/activities?evacuationLeadId=eva-1": { body: { data: [{ id: "a-1", type: "email" }] } },
  });
}

describe("evacuation-leads/[id] load", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login when user is null", async () => {
    vi.stubGlobal("fetch", defaultMockFetch());
    const event = makeEvent({ user: null });
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns evacuationLead, activities, and user on success", async () => {
    vi.stubGlobal("fetch", defaultMockFetch());
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.evacuationLead).toEqual(sampleLead);
    expect(result.activities).toEqual([{ id: "a-1", type: "email" }]);
    expect(result.marketingAttribution).toBeNull();
    expect(result.user).toBeDefined();
  });

  it("redirects to /leads/evacuation-leads when lead API returns error", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { status: 404, body: { error: "Not found" } },
    }));

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("fetches marketing attribution when lead has marketing_attribution_id", async () => {
    const leadWithAttr = { ...sampleLead, marketing_attribution_id: "mat-1" };
    const sampleAttr = { id: "mat-1", crmDisplayId: "MAT-AAA-001" };
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { body: { data: leadWithAttr } },
      "/api/activities?evacuationLeadId=eva-1": { body: { data: [] } },
      "/api/marketing-attributions/mat-1": { body: { data: sampleAttr } },
    }));

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.marketingAttribution).toEqual(sampleAttr);
  });

  it("returns leadScore when lead-scores API returns data", async () => {
    const sampleScore = { id: "sco-1", scoreTotal: 45, scoreFit: 30, scoreIntent: 5, scoreEngagement: 15, scoreNegative: 5 };
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { body: { data: sampleLead } },
      "/api/activities?evacuationLeadId=eva-1": { body: { data: [] } },
      "/api/lead-scores/by-parent/evacuation_lead/eva-1": { body: { data: sampleScore } },
    }));

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.leadScore).toEqual(sampleScore);
  });

  it("returns null leadScore when lead-scores API returns null data", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { body: { data: sampleLead } },
      "/api/activities?evacuationLeadId=eva-1": { body: { data: [] } },
      "/api/lead-scores/by-parent/evacuation_lead/eva-1": { body: { data: null } },
    }));

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.leadScore).toBeNull();
  });

  it("returns empty activities when activities API fails", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { body: { data: sampleLead } },
      "/api/activities?evacuationLeadId=eva-1": { status: 500, body: {} },
    }));

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.evacuationLead).toEqual(sampleLead);
    expect(result.activities).toEqual([]);
  });
});

describe("evacuation-leads/[id] updateStatus action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on status update", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { body: { data: {} } },
    }));

    const event = makeEvent({ formData: { status: "qualified" } });
    const result = await actions.updateStatus(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { status: 400, body: { error: "Invalid status" } },
    }));

    const event = makeEvent({ formData: { status: "bad" } });
    const result = await actions.updateStatus(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("evacuation-leads/[id] updateNote action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on note update", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { body: { data: {} } },
    }));

    const event = makeEvent({ formData: { note: "Called and left voicemail" } });
    const result = await actions.updateNote(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { status: 500, body: { error: "Server error" } },
    }));

    const event = makeEvent({ formData: { note: "test" } });
    const result = await actions.updateNote(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("evacuation-leads/[id] delete action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /leads/evacuation-leads on successful delete", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { body: {} },
    }));

    const event = makeEvent();
    try {
      await actions.delete(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns failure when API returns error", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { status: 500, body: { error: "Server error" } },
    }));

    const event = makeEvent();
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("evacuation-leads/[id] addActivity action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on activity creation", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
    }));

    const event = makeEvent({
      formData: { type: "email", subject: "Initial outreach", activityDate: "2025-01-15" },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/activities": { status: 400, body: { error: "Bad request" } },
    }));

    const event = makeEvent({ formData: { type: "email", subject: "Test" } });
    const result = await actions.addActivity(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("evacuation-leads/[id] linkHuman action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on link", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/link-human": { body: { data: {} } },
    }));

    const event = makeEvent({ formData: { humanId: "h-1" } });
    const result = await actions.linkHuman(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/link-human": { status: 400, body: { error: "Already linked" } },
    }));

    const event = makeEvent({ formData: { humanId: "h-1" } });
    const result = await actions.linkHuman(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Already linked");
    }
  });
});

describe("evacuation-leads/[id] unlinkHuman action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on unlink", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/link-human": { body: {} },
    }));

    const event = makeEvent();
    const result = await actions.unlinkHuman(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/link-human": { status: 500, body: { error: "Server error" } },
    }));

    const event = makeEvent();
    const result = await actions.unlinkHuman(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("evacuation-leads/[id] addEmail action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when email is added", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/emails": { body: { data: { id: "eml-1" } } },
    }));

    const event = makeEvent({ formData: { email: "new@example.com" } });
    const result = await actions.addEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/emails": { status: 422, body: { error: "Invalid email" } },
    }));

    const event = makeEvent({ formData: { email: "bad" } });
    const result = await actions.addEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("evacuation-leads/[id] deleteEmail action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when email is deleted", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/emails/eml-1": { body: {} },
    }));

    const event = makeEvent({ formData: { emailId: "eml-1" } });
    const result = await actions.deleteEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/emails/eml-1": { status: 500, body: { error: "Server error" } },
    }));

    const event = makeEvent({ formData: { emailId: "eml-1" } });
    const result = await actions.deleteEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("evacuation-leads/[id] addPhoneNumber action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when phone number is added", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/phone-numbers": { body: { data: { id: "fon-1" } } },
    }));

    const event = makeEvent({ formData: { phoneNumber: "+15551234567" } });
    const result = await actions.addPhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/phone-numbers": { status: 422, body: { error: "Invalid phone" } },
    }));

    const event = makeEvent({ formData: { phoneNumber: "bad" } });
    const result = await actions.addPhoneNumber(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("evacuation-leads/[id] deletePhoneNumber action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when phone number is deleted", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/phone-numbers/fon-1": { body: {} },
    }));

    const event = makeEvent({ formData: { phoneNumberId: "fon-1" } });
    const result = await actions.deletePhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/phone-numbers/fon-1": { status: 500, body: { error: "Server error" } },
    }));

    const event = makeEvent({ formData: { phoneNumberId: "fon-1" } });
    const result = await actions.deletePhoneNumber(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("evacuation-leads/[id] addSocialId action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when social ID is added", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/social-ids": { body: { data: { id: "soc-1" } } },
    }));

    const event = makeEvent({ formData: { handle: "@user", platformId: "plat-1" } });
    const result = await actions.addSocialId(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/social-ids": { status: 422, body: { error: "Handle required" } },
    }));

    const event = makeEvent({ formData: { handle: "", platformId: "plat-1" } });
    const result = await actions.addSocialId(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("evacuation-leads/[id] deleteSocialId action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when social ID is deleted", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/social-ids/soc-1": { body: {} },
    }));

    const event = makeEvent({ formData: { socialIdId: "soc-1" } });
    const result = await actions.deleteSocialId(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1/social-ids/soc-1": { status: 500, body: { error: "Server error" } },
    }));

    const event = makeEvent({ formData: { socialIdId: "soc-1" } });
    const result = await actions.deleteSocialId(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("evacuation-leads/[id] updateSourceChannel action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when source/channel are updated", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { body: { data: {} } },
    }));

    const event = makeEvent({ formData: { source: "Meta Ads", channel: "WhatsApp" } });
    const result = await actions.updateSourceChannel(event as any);
    expect(result).toEqual({ success: true });
  });

  it("sends null for empty source/channel", async () => {
    const mockFetch = createMockFetch({
      "/api/evacuation-leads/eva-1": { body: { data: {} } },
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
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { status: 400, body: { error: "Bad request" } },
    }));

    const event = makeEvent({ formData: { source: "Google", channel: "Email" } });
    const result = await actions.updateSourceChannel(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("evacuation-leads/[id] load returns leadSources and leadChannels", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns leadSources and leadChannels from config", async () => {
    vi.stubGlobal("fetch", createMockFetch({
      "/api/evacuation-leads/eva-1": { body: { data: sampleLead } },
      "/api/activities?evacuationLeadId=eva-1": { body: { data: [] } },
      "account-config/batch": {
        body: {
          data: {
            "social-id-platforms": [],
            "lead-sources": [{ id: "ls1", name: "Google Ads", createdAt: "2025-01-01" }],
            "lead-channels": [{ id: "lc1", name: "Email", createdAt: "2025-01-01" }],
            "loss-reasons": [{ id: "lr1", name: "Price", createdAt: "2025-01-01" }],
          },
        },
      },
    }));

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.leadSources).toEqual([{ id: "ls1", name: "Google Ads", createdAt: "2025-01-01" }]);
    expect(result.leadChannels).toEqual([{ id: "lc1", name: "Email", createdAt: "2025-01-01" }]);
    expect(result.lossReasons).toEqual([{ id: "lr1", name: "Price", createdAt: "2025-01-01" }]);
  });
});
