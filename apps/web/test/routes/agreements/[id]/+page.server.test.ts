import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch, mockBatchConfigResponse } from "../../../helpers";
import { load } from "../../../../src/routes/agreements/[id]/+page.server";

const sampleAgreement = {
  id: "agr-1",
  title: "Service Agreement",
  status: "active",
  typeId: "type-1",
  humanId: "h-1",
  accountId: "acc-1",
  activationDate: "2025-01-15",
  notes: "Initial agreement",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "agr-1" };
  return event;
}

describe("agreements/[id] +page.server load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Order matters: more specific patterns before general ones (createMockFetch uses includes())
    mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "agreement-types": [{ id: "type-1", name: "Service", createdAt: "2025-01-01" }],
      }),
      "/api/documents": {
        status: 200,
        body: { data: [{ id: "doc-1", name: "contract.pdf", entityType: "agreement", entityId: "agr-1" }] },
      },
      "/api/agreements/agr-1": { status: 200, body: { data: sampleAgreement } },
      "/api/humans": {
        status: 200,
        body: { data: [{ id: "h-1", displayId: "HUM-AAA-001", firstName: "Alice", middleName: null, lastName: "Smith", status: "active", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z", emails: [], types: [] }] },
      },
      "/api/accounts": {
        status: 200,
        body: { data: [{ id: "acc-1", displayId: "ACC-AAA-001", name: "Acme Corp", status: "active", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z", types: [] }] },
      },
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
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/login");
    }
  });

  it("returns agreement, allHumans, allAccounts, agreementTypes, and documents on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);

    expect(result.agreement).toEqual(sampleAgreement);
    expect(result.allHumans).toHaveLength(1);
    expect(result.allHumans[0]).toMatchObject({ id: "h-1", firstName: "Alice", lastName: "Smith" });
    expect(result.allAccounts).toHaveLength(1);
    expect(result.allAccounts[0]).toMatchObject({ id: "acc-1", name: "Acme Corp" });
    expect(result.agreementTypes).toHaveLength(1);
    expect(result.agreementTypes[0]).toMatchObject({ id: "type-1", name: "Service" });
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({ id: "doc-1", name: "contract.pdf" });
  });

  it("redirects to /agreements when agreement API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/agreements/agr-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/agreements");
    }
  });

  it("redirects to /agreements when agreement response has no data field", async () => {
    mockFetch = createMockFetch({
      "/api/agreements/agr-1": { status: 200, body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/agreements");
    }
  });

  it("returns empty documents when documents API fails", async () => {
    mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "agreement-types": [{ id: "type-1", name: "Service", createdAt: "2025-01-01" }],
      }),
      "/api/documents": { status: 500, body: { error: "Server error" } },
      "/api/agreements/agr-1": { status: 200, body: { data: sampleAgreement } },
      "/api/humans": { status: 200, body: { data: [] } },
      "/api/accounts": { status: 200, body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);

    expect(result.agreement).toEqual(sampleAgreement);
    expect(result.documents).toEqual([]);
  });

  it("returns empty agreementTypes when batch config API fails", async () => {
    mockFetch = createMockFetch({
      "account-config/batch": { status: 500, body: { error: "Server error" } },
      "/api/documents": { status: 200, body: { data: [] } },
      "/api/agreements/agr-1": { status: 200, body: { data: sampleAgreement } },
      "/api/humans": { status: 200, body: { data: [] } },
      "/api/accounts": { status: 200, body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);

    expect(result.agreementTypes).toEqual([]);
  });

  it("returns empty allHumans and allAccounts when those APIs fail", async () => {
    mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({ "agreement-types": [] }),
      "/api/documents": { status: 200, body: { data: [] } },
      "/api/agreements/agr-1": { status: 200, body: { data: sampleAgreement } },
      "/api/humans": { status: 500, body: { error: "Server error" } },
      "/api/accounts": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);

    expect(result.allHumans).toEqual([]);
    expect(result.allAccounts).toEqual([]);
  });

  it("uses the id param to fetch the correct agreement", async () => {
    const event = makeEvent();
    await load(event as any);

    const calledUrls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calledUrls.some((u: string) => u.includes("/api/agreements/agr-1"))).toBe(true);
  });
});
