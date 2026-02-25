import { describe, it, expect } from "vitest";
import {
  parseRealtimePath,
  getApiPath,
  ENTITY_TYPES,
} from "$lib/data/registry";

describe("registry", () => {
  describe("ENTITY_TYPES", () => {
    it("includes core entity types", () => {
      expect(ENTITY_TYPES).toContain("humans");
      expect(ENTITY_TYPES).toContain("accounts");
      expect(ENTITY_TYPES).toContain("activities");
      expect(ENTITY_TYPES).toContain("opportunities");
      expect(ENTITY_TYPES).toContain("pets");
      expect(ENTITY_TYPES).toContain("flights");
      expect(ENTITY_TYPES).toContain("colleagues");
    });
  });

  describe("getApiPath", () => {
    it("returns the API path for a known entity type", () => {
      expect(getApiPath("humans")).toBe("/api/humans");
      expect(getApiPath("accounts")).toBe("/api/accounts");
      expect(getApiPath("activities")).toBe("/api/activities");
      expect(getApiPath("opportunities")).toBe("/api/opportunities");
      expect(getApiPath("pets")).toBe("/api/pets");
      expect(getApiPath("flights")).toBe("/api/flights");
      expect(getApiPath("colleagues")).toBe("/api/colleagues");
    });

    it("returns null for unknown entity type", () => {
      expect(getApiPath("unknown-entity")).toBeNull();
    });
  });

  describe("parseRealtimePath", () => {
    it("parses entity list path", () => {
      expect(parseRealtimePath("/api/humans")).toEqual({
        entityType: "humans",
        id: undefined,
      });
    });

    it("parses entity detail path with id", () => {
      expect(parseRealtimePath("/api/humans/abc123")).toEqual({
        entityType: "humans",
        id: "abc123",
      });
    });

    it("parses accounts path", () => {
      expect(parseRealtimePath("/api/accounts/xyz")).toEqual({
        entityType: "accounts",
        id: "xyz",
      });
    });

    it("parses activities path", () => {
      expect(parseRealtimePath("/api/activities")).toEqual({
        entityType: "activities",
        id: undefined,
      });
    });

    it("parses opportunities path", () => {
      expect(parseRealtimePath("/api/opportunities/opp-1")).toEqual({
        entityType: "opportunities",
        id: "opp-1",
      });
    });

    it("returns null for unknown paths", () => {
      expect(parseRealtimePath("/api/unknown-thing")).toBeNull();
    });

    it("returns null for non-API paths", () => {
      expect(parseRealtimePath("/dashboard")).toBeNull();
    });

    it("handles general-leads path", () => {
      expect(parseRealtimePath("/api/general-leads/gl1")).toEqual({
        entityType: "general-leads",
        id: "gl1",
      });
    });

    it("handles route-signups path", () => {
      expect(parseRealtimePath("/api/route-signups")).toEqual({
        entityType: "route-signups",
        id: undefined,
      });
    });

    it("handles website-booking-requests path", () => {
      expect(parseRealtimePath("/api/website-booking-requests/br1")).toEqual({
        entityType: "website-booking-requests",
        id: "br1",
      });
    });
  });
});
