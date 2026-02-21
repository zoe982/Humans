import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch, mockConfigItem } from "../../../helpers";
import { load, actions } from "../../../../src/routes/phone-numbers/new/+page.server";

describe("phone-numbers/new load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { data: [{ id: "h-1", firstName: "Jane" }] } },
      "/api/admin/account-config/human-phone-labels": {
        body: { data: [mockConfigItem({ id: "lbl-1", name: "Mobile" })] },
      },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

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
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/login");
    }
  });

  it("returns allHumans and phoneLabelConfigs on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([{ id: "h-1", firstName: "Jane" }]);
    expect(result.phoneLabelConfigs).toEqual([mockConfigItem({ id: "lbl-1", name: "Mobile" })]);
  });

  it("returns empty allHumans when humans API fails", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { status: 500, body: {} },
      "/api/admin/account-config/human-phone-labels": {
        body: { data: [mockConfigItem({ id: "lbl-1", name: "Mobile" })] },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([]);
    expect(result.phoneLabelConfigs).toEqual([mockConfigItem({ id: "lbl-1", name: "Mobile" })]);
  });

  it("returns empty phoneLabelConfigs when labels API fails", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { data: [{ id: "h-1", firstName: "Jane" }] } },
      "/api/admin/account-config/human-phone-labels": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([{ id: "h-1", firstName: "Jane" }]);
    expect(result.phoneLabelConfigs).toEqual([]);
  });

  it("returns empty arrays when both APIs fail", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { status: 500, body: {} },
      "/api/admin/account-config/human-phone-labels": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([]);
    expect(result.phoneLabelConfigs).toEqual([]);
  });

  it("returns empty allHumans when API returns non-list response", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { message: "unexpected" } },
      "/api/admin/account-config/human-phone-labels": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([]);
  });

  it("passes session token in cookie header for humans fetch", async () => {
    const event = mockEvent({ sessionToken: "sess-abc" });
    await load(event as any);
    const humanCall = mockFetch.mock.calls.find((c: unknown[]) =>
      String(c[0]).includes("/api/humans"),
    );
    expect(humanCall).toBeDefined();
    expect((humanCall as any)[1].headers).toEqual(
      expect.objectContaining({ Cookie: "humans_session=sess-abc" }),
    );
  });
});

describe("phone-numbers/new create action", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/phone-numbers": { body: { data: { id: "phone-new-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to new phone-number on successful create", async () => {
    const event = mockEvent({
      formData: { humanId: "h-1", phoneNumber: "+1 555-0100", labelId: "lbl-1", isPrimary: "on", hasWhatsapp: "on" },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/phone-numbers/phone-new-1");
    }
  });

  it("returns failure when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/phone-numbers": { status: 422, body: { error: "Invalid phone number" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { humanId: "h-1", phoneNumber: "not-a-phone" },
    });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(422);
      expect(result.data.error).toBe("Invalid phone number");
    }
  });

  it("returns failure when API returns unexpected response shape", async () => {
    mockFetch = createMockFetch({
      "/api/phone-numbers": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { humanId: "h-1", phoneNumber: "+1 555-0100" },
    });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(500);
    }
  });

  it("sends hasWhatsapp as true when form field is 'on'", async () => {
    const event = mockEvent({
      formData: { humanId: "h-1", phoneNumber: "+1 555-0100", hasWhatsapp: "on" },
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
    const body = JSON.parse((postCall as any)[1].body);
    expect(body.hasWhatsapp).toBe(true);
  });

  it("sends hasWhatsapp as false when form field is not 'on'", async () => {
    const event = mockEvent({
      formData: { humanId: "h-1", phoneNumber: "+1 555-0100" },
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
    const body = JSON.parse((postCall as any)[1].body);
    expect(body.hasWhatsapp).toBe(false);
  });

  it("sends isPrimary as true when form field is 'on'", async () => {
    const event = mockEvent({
      formData: { humanId: "h-1", phoneNumber: "+1 555-0100", isPrimary: "on" },
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
    const body = JSON.parse((postCall as any)[1].body);
    expect(body.isPrimary).toBe(true);
  });

  it("sends isPrimary as false when form field is not 'on'", async () => {
    const event = mockEvent({
      formData: { humanId: "h-1", phoneNumber: "+1 555-0100" },
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
    const body = JSON.parse((postCall as any)[1].body);
    expect(body.isPrimary).toBe(false);
  });

  it("sends labelId as undefined when not provided", async () => {
    const event = mockEvent({
      formData: { humanId: "h-1", phoneNumber: "+1 555-0100" },
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
    const body = JSON.parse((postCall as any)[1].body);
    expect(body.labelId).toBeUndefined();
  });

  it("returns failure on 400 API error", async () => {
    mockFetch = createMockFetch({
      "/api/phone-numbers": { status: 400, body: { error: { message: "Bad request" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { humanId: "h-1", phoneNumber: "bad" } });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
    }
  });
});
