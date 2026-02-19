import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/admin/account-config/+page.server";

describe("admin/account-config +page.server", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("load", () => {
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

    it("redirects to /dashboard when user is not admin", async () => {
      const event = mockEvent({ user: { id: "u1", email: "a@b.com", role: "agent", name: "Agent" } });
      try {
        await load(event as any);
        expect.fail("should have redirected");
      } catch (e) {
        expect(isRedirect(e)).toBe(true);
        expect((e as Redirect).status).toBe(302);
        expect((e as Redirect).location).toBe("/dashboard");
      }
    });

    it("returns all config data on successful load", async () => {
      mockFetch = createMockFetch({
        "account-types": { body: { data: [{ id: "1", name: "Vendor" }] } },
        "account-human-labels": { body: { data: [{ id: "2", name: "Primary Contact" }] } },
        "account-email-labels": { body: { data: [{ id: "3", name: "Work" }] } },
        "account-phone-labels": { body: { data: [{ id: "4", name: "Office" }] } },
        "human-email-labels": { body: { data: [{ id: "5", name: "Personal" }] } },
        "human-phone-labels": { body: { data: [{ id: "6", name: "Mobile" }] } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
      const result = await load(event as any);

      expect(result.accountTypes).toEqual([{ id: "1", name: "Vendor" }]);
      expect(result.humanLabels).toEqual([{ id: "2", name: "Primary Contact" }]);
      expect(result.emailLabels).toEqual([{ id: "3", name: "Work" }]);
      expect(result.phoneLabels).toEqual([{ id: "4", name: "Office" }]);
      expect(result.humanEmailLabels).toEqual([{ id: "5", name: "Personal" }]);
      expect(result.humanPhoneLabels).toEqual([{ id: "6", name: "Mobile" }]);
    });

    it("returns empty arrays when API returns errors", async () => {
      mockFetch = createMockFetch({
        "account-config": { status: 500, body: { error: "Internal error" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
      const result = await load(event as any);

      expect(result.accountTypes).toEqual([]);
      expect(result.humanLabels).toEqual([]);
      expect(result.emailLabels).toEqual([]);
      expect(result.phoneLabels).toEqual([]);
      expect(result.humanEmailLabels).toEqual([]);
      expect(result.humanPhoneLabels).toEqual([]);
    });

    it("returns empty arrays when API returns non-list data", async () => {
      mockFetch = createMockFetch({
        "account-config": { body: { message: "unexpected shape" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
      const result = await load(event as any);

      expect(result.accountTypes).toEqual([]);
    });
  });

  describe("actions", () => {
    describe("createAccountType", () => {
      it("creates an account type successfully", async () => {
        mockFetch = createMockFetch({
          "account-types": { body: { data: { id: "1", name: "Vendor" } } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { name: "Vendor" } });
        const result = await actions.createAccountType(event as any);

        expect(result).toEqual({ success: true });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("account-types"),
          expect.objectContaining({ method: "POST" }),
        );
      });

      it("returns failure when API errors", async () => {
        mockFetch = createMockFetch({
          "account-types": { status: 409, body: { error: "Already exists", code: "CONFLICT" } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { name: "Duplicate" } });
        const result = await actions.createAccountType(event as any);

        expect(isActionFailure(result)).toBe(true);
        if (isActionFailure(result)) {
          expect(result.status).toBe(409);
          expect(result.data.error).toBe("Already exists");
          expect(result.data.code).toBe("CONFLICT");
        }
      });
    });

    describe("deleteAccountType", () => {
      it("deletes an account type successfully", async () => {
        mockFetch = createMockFetch({
          "account-types": { body: {} },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "type-1" } });
        const result = await actions.deleteAccountType(event as any);

        expect(result).toEqual({ success: true });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("account-types/type-1"),
          expect.objectContaining({ method: "DELETE" }),
        );
      });

      it("returns failure when API errors", async () => {
        mockFetch = createMockFetch({
          "account-types": { status: 404, body: { error: "Not found" } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "bad-id" } });
        const result = await actions.deleteAccountType(event as any);

        expect(isActionFailure(result)).toBe(true);
        if (isActionFailure(result)) {
          expect(result.status).toBe(404);
        }
      });
    });

    describe("createHumanLabel", () => {
      it("creates a human label successfully", async () => {
        mockFetch = createMockFetch({
          "account-human-labels": { body: { data: { id: "1", name: "CEO" } } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { name: "CEO" } });
        const result = await actions.createHumanLabel(event as any);

        expect(result).toEqual({ success: true });
      });

      it("returns failure when API errors", async () => {
        mockFetch = createMockFetch({
          "account-human-labels": { status: 400, body: { error: "Invalid name" } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { name: "" } });
        const result = await actions.createHumanLabel(event as any);

        expect(isActionFailure(result)).toBe(true);
      });
    });

    describe("deleteHumanLabel", () => {
      it("deletes a human label successfully", async () => {
        mockFetch = createMockFetch({
          "account-human-labels": { body: {} },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "label-1" } });
        const result = await actions.deleteHumanLabel(event as any);

        expect(result).toEqual({ success: true });
      });

      it("returns failure when API errors", async () => {
        mockFetch = createMockFetch({
          "account-human-labels": { status: 404, body: { error: "Not found" } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "bad-id" } });
        const result = await actions.deleteHumanLabel(event as any);

        expect(isActionFailure(result)).toBe(true);
      });
    });

    describe("createEmailLabel", () => {
      it("creates an email label successfully", async () => {
        mockFetch = createMockFetch({
          "account-email-labels": { body: { data: { id: "1", name: "Work" } } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { name: "Work" } });
        const result = await actions.createEmailLabel(event as any);

        expect(result).toEqual({ success: true });
      });

      it("returns failure when API errors", async () => {
        mockFetch = createMockFetch({
          "account-email-labels": { status: 500, body: { error: "Server error" } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { name: "Work" } });
        const result = await actions.createEmailLabel(event as any);

        expect(isActionFailure(result)).toBe(true);
        if (isActionFailure(result)) {
          expect(result.status).toBe(500);
        }
      });
    });

    describe("deleteEmailLabel", () => {
      it("deletes an email label successfully", async () => {
        mockFetch = createMockFetch({
          "account-email-labels": { body: {} },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "el-1" } });
        const result = await actions.deleteEmailLabel(event as any);

        expect(result).toEqual({ success: true });
      });

      it("returns failure when API errors", async () => {
        mockFetch = createMockFetch({
          "account-email-labels": { status: 500, body: { error: "Server error" } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "el-1" } });
        const result = await actions.deleteEmailLabel(event as any);

        expect(isActionFailure(result)).toBe(true);
      });
    });

    describe("createPhoneLabel", () => {
      it("creates a phone label successfully", async () => {
        mockFetch = createMockFetch({
          "account-phone-labels": { body: { data: { id: "1", name: "Office" } } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { name: "Office" } });
        const result = await actions.createPhoneLabel(event as any);

        expect(result).toEqual({ success: true });
      });

      it("returns failure when API errors", async () => {
        mockFetch = createMockFetch({
          "account-phone-labels": { status: 422, body: { error: "Validation failed" } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { name: "" } });
        const result = await actions.createPhoneLabel(event as any);

        expect(isActionFailure(result)).toBe(true);
      });
    });

    describe("deletePhoneLabel", () => {
      it("deletes a phone label successfully", async () => {
        mockFetch = createMockFetch({
          "account-phone-labels": { body: {} },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "pl-1" } });
        const result = await actions.deletePhoneLabel(event as any);

        expect(result).toEqual({ success: true });
      });

      it("returns failure when API errors", async () => {
        mockFetch = createMockFetch({
          "account-phone-labels": { status: 404, body: { error: "Not found" } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "pl-1" } });
        const result = await actions.deletePhoneLabel(event as any);

        expect(isActionFailure(result)).toBe(true);
      });
    });

    describe("createHumanEmailLabel", () => {
      it("creates a human email label successfully", async () => {
        mockFetch = createMockFetch({
          "human-email-labels": { body: { data: { id: "1", name: "Personal" } } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { name: "Personal" } });
        const result = await actions.createHumanEmailLabel(event as any);

        expect(result).toEqual({ success: true });
      });

      it("returns failure when API errors", async () => {
        mockFetch = createMockFetch({
          "human-email-labels": { status: 409, body: { error: "Duplicate" } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { name: "Personal" } });
        const result = await actions.createHumanEmailLabel(event as any);

        expect(isActionFailure(result)).toBe(true);
      });
    });

    describe("deleteHumanEmailLabel", () => {
      it("deletes a human email label successfully", async () => {
        mockFetch = createMockFetch({
          "human-email-labels": { body: {} },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "hel-1" } });
        const result = await actions.deleteHumanEmailLabel(event as any);

        expect(result).toEqual({ success: true });
      });

      it("returns failure when API errors", async () => {
        mockFetch = createMockFetch({
          "human-email-labels": { status: 500, body: { error: "Server error" } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "hel-1" } });
        const result = await actions.deleteHumanEmailLabel(event as any);

        expect(isActionFailure(result)).toBe(true);
      });
    });

    describe("createHumanPhoneLabel", () => {
      it("creates a human phone label successfully", async () => {
        mockFetch = createMockFetch({
          "human-phone-labels": { body: { data: { id: "1", name: "Mobile" } } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { name: "Mobile" } });
        const result = await actions.createHumanPhoneLabel(event as any);

        expect(result).toEqual({ success: true });
      });

      it("returns failure when API errors", async () => {
        mockFetch = createMockFetch({
          "human-phone-labels": { status: 400, body: { error: "Bad request" } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { name: "" } });
        const result = await actions.createHumanPhoneLabel(event as any);

        expect(isActionFailure(result)).toBe(true);
      });
    });

    describe("deleteHumanPhoneLabel", () => {
      it("deletes a human phone label successfully", async () => {
        mockFetch = createMockFetch({
          "human-phone-labels": { body: {} },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "hpl-1" } });
        const result = await actions.deleteHumanPhoneLabel(event as any);

        expect(result).toEqual({ success: true });
      });

      it("returns failure when API errors", async () => {
        mockFetch = createMockFetch({
          "human-phone-labels": { status: 404, body: { error: "Not found" } },
        });
        vi.stubGlobal("fetch", mockFetch);

        const event = mockEvent({ formData: { id: "hpl-1" } });
        const result = await actions.deleteHumanPhoneLabel(event as any);

        expect(isActionFailure(result)).toBe(true);
      });
    });
  });
});
