import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect, type ActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch, mockBatchConfigResponse } from "../../../helpers";
import { load, actions } from "../../../../src/routes/agreements/new/+page.server";

describe("agreements/new +page.server load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "agreement-types": [{ id: "type-1", name: "Service Agreement", createdAt: "2025-01-01" }],
      }),
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

  it("returns allHumans, allAccounts, and agreementTypes on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);

    expect(result.allHumans).toHaveLength(1);
    expect(result.allHumans[0]).toMatchObject({ id: "h-1", firstName: "Alice", lastName: "Smith" });
    expect(result.allAccounts).toHaveLength(1);
    expect(result.allAccounts[0]).toMatchObject({ id: "acc-1", name: "Acme Corp" });
    expect(result.agreementTypes).toHaveLength(1);
    expect(result.agreementTypes[0]).toMatchObject({ id: "type-1", name: "Service Agreement" });
  });

  it("returns empty arrays when all dependency APIs fail", async () => {
    mockFetch = createMockFetch({
      "account-config/batch": { status: 500, body: { error: "Server error" } },
      "/api/humans": { status: 500, body: { error: "Server error" } },
      "/api/accounts": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.allHumans).toEqual([]);
    expect(result.allAccounts).toEqual([]);
    expect(result.agreementTypes).toEqual([]);
  });

  it("returns empty agreementTypes when batch config API fails", async () => {
    mockFetch = createMockFetch({
      "account-config/batch": { status: 500, body: { error: "Server error" } },
      "/api/humans": { status: 200, body: { data: [{ id: "h-1", displayId: "HUM-AAA-001", firstName: "Alice", middleName: null, lastName: "Smith", status: "active", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z", emails: [], types: [] }] } },
      "/api/accounts": { status: 200, body: { data: [{ id: "acc-1", displayId: "ACC-AAA-001", name: "Acme Corp", status: "active", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z", types: [] }] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.agreementTypes).toEqual([]);
    expect(result.allHumans).toHaveLength(1);
    expect(result.allAccounts).toHaveLength(1);
  });
});

describe("agreements/new actions.create", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates an agreement and redirects to the detail page", async () => {
    const mockFetch = createMockFetch({
      "/api/agreements": { status: 201, body: { data: { id: "agr-new-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { title: "Service Contract", typeId: "type-1", humanId: "h-1" },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/agreements/agr-new-1");
    }
  });

  it("returns failure when API returns an error", async () => {
    const mockFetch = createMockFetch({
      "/api/agreements": {
        status: 422,
        body: { error: "Title is required", code: "VALIDATION_ERROR", requestId: "req-abc" },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { title: "" } });
    const result = await actions.create(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string; code?: string; requestId?: string }>;
    expect(failure.status).toBe(422);
    expect(failure.data.error).toBe("Title is required");
    expect(failure.data.code).toBe("VALIDATION_ERROR");
    expect(failure.data.requestId).toBe("req-abc");
  });

  it("returns failure with fallback message when API returns error without message field", async () => {
    const mockFetch = createMockFetch({
      "/api/agreements": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { title: "My Agreement" } });
    const result = await actions.create(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string; code?: string; requestId?: string }>;
    expect(failure.status).toBe(500);
    expect(typeof failure.data.error).toBe("string");
    expect(failure.data.error.length).toBeGreaterThan(0);
  });

  it("returns failure when response has unexpected shape", async () => {
    const mockFetch = createMockFetch({
      "/api/agreements": { status: 201, body: { weird: "shape" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { title: "My Agreement" } });
    const result = await actions.create(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string; code?: string; requestId?: string }>;
    expect(failure.status).toBe(500);
    expect(failure.data.error).toBe("Unexpected response");
  });

  it("sends title and optional fields as JSON to the API", async () => {
    const mockFetch = createMockFetch({
      "/api/agreements": { status: 201, body: { data: { id: "agr-x" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: {
        title: "Freight Services",
        typeId: "type-2",
        humanId: "h-5",
        accountId: "acc-3",
        activationDate: "2025-06-01",
        notes: "Annual renewal",
      },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }

    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(((postCall as unknown[])[1] as RequestInit).body as string);
    expect(body.title).toBe("Freight Services");
    expect(body.typeId).toBe("type-2");
    expect(body.humanId).toBe("h-5");
    expect(body.accountId).toBe("acc-3");
    expect(body.activationDate).toBe("2025-06-01");
    expect(body.notes).toBe("Annual renewal");
  });

  it("omits optional fields from payload when they are empty strings", async () => {
    const mockFetch = createMockFetch({
      "/api/agreements": { status: 201, body: { data: { id: "agr-y" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { title: "Minimal Agreement", typeId: "", humanId: "", accountId: "" },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }

    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(((postCall as unknown[])[1] as RequestInit).body as string);
    expect(body.title).toBe("Minimal Agreement");
    expect(body.typeId).toBeUndefined();
    expect(body.humanId).toBeUndefined();
    expect(body.accountId).toBeUndefined();
  });
});
