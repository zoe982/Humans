import { describe, it, expect } from "vitest";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  OAUTH_STATE_TTL_SECONDS,
  ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  PET_BREEDS,
} from "./constants";

describe("session constants", () => {
  it("SESSION_COOKIE_NAME is humans_session", () => {
    expect(SESSION_COOKIE_NAME).toBe("humans_session");
  });

  it("SESSION_TTL_SECONDS is 24 hours", () => {
    expect(SESSION_TTL_SECONDS).toBe(86400);
  });

  it("OAUTH_STATE_TTL_SECONDS is 10 minutes", () => {
    expect(OAUTH_STATE_TTL_SECONDS).toBe(600);
  });
});

describe("ROLES", () => {
  it("contains exactly 4 roles", () => {
    expect(ROLES).toHaveLength(4);
  });

  it("contains expected roles", () => {
    expect(ROLES).toContain("admin");
    expect(ROLES).toContain("manager");
    expect(ROLES).toContain("agent");
    expect(ROLES).toContain("viewer");
  });
});

describe("ROLE_HIERARCHY", () => {
  it("viewer has lowest rank (0)", () => {
    expect(ROLE_HIERARCHY.viewer).toBe(0);
  });

  it("admin has highest rank (3)", () => {
    expect(ROLE_HIERARCHY.admin).toBe(3);
  });

  it("manager outranks agent", () => {
    expect(ROLE_HIERARCHY.manager).toBeGreaterThan(ROLE_HIERARCHY.agent);
  });

  it("agent outranks viewer", () => {
    expect(ROLE_HIERARCHY.agent).toBeGreaterThan(ROLE_HIERARCHY.viewer);
  });

  it("has entries for all ROLES", () => {
    const hierarchyKeys = Object.keys(ROLE_HIERARCHY);
    for (const role of ROLES) {
      expect(hierarchyKeys).toContain(role);
    }
  });
});

describe("PERMISSIONS", () => {
  it("viewRecords is accessible to all roles", () => {
    expect(PERMISSIONS.viewRecords).toHaveLength(4);
  });

  it("manageColleagues is admin-only", () => {
    expect(PERMISSIONS.manageColleagues).toStrictEqual(["admin"]);
  });

  it("viewAuditLog is admin-only", () => {
    expect(PERMISSIONS.viewAuditLog).toStrictEqual(["admin"]);
  });

  it("createEditRecords excludes viewer", () => {
    expect(PERMISSIONS.createEditRecords).not.toContain("viewer");
    expect(PERMISSIONS.createEditRecords).toContain("agent");
  });

  it("all permission values contain only valid roles", () => {
    for (const [, roles] of Object.entries(PERMISSIONS)) {
      for (const role of roles) {
        expect(ROLES).toContain(role);
      }
    }
  });

  it("has expected permission keys", () => {
    const keys = Object.keys(PERMISSIONS);
    expect(keys).toContain("viewRecords");
    expect(keys).toContain("createEditRecords");
    expect(keys).toContain("manageColleagues");
    expect(keys).toContain("viewAuditLog");
    expect(keys).toContain("manageHumans");
    expect(keys).toContain("manageAccounts");
  });
});

describe("PET_BREEDS", () => {
  it("is non-empty", () => {
    expect(PET_BREEDS.length).toBeGreaterThan(0);
  });

  it("contains common breeds", () => {
    expect(PET_BREEDS).toContain("Golden Retriever");
    expect(PET_BREEDS).toContain("Labrador");
    expect(PET_BREEDS).toContain("Poodle");
  });

  it("ends with Mixed Breed and Other", () => {
    expect(PET_BREEDS[PET_BREEDS.length - 2]).toBe("Mixed Breed");
    expect(PET_BREEDS[PET_BREEDS.length - 1]).toBe("Other");
  });

  it("has no duplicates", () => {
    const unique = new Set(PET_BREEDS);
    expect(unique.size).toBe(PET_BREEDS.length);
  });
});
