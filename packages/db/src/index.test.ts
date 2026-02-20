import { describe, it, expect } from "vitest";
import * as db from "./index";

describe("package root exports", () => {
  it("exports createId", () => {
    expect(typeof db.createId).toBe("function");
  });

  it("exports core schema tables", () => {
    expect(db.colleagues).toBeDefined();
    expect(db.pets).toBeDefined();
    expect(db.leadSources).toBeDefined();
    expect(db.leadEvents).toBeDefined();
    expect(db.auditLog).toBeDefined();
  });

  it("exports human-related tables", () => {
    expect(db.humans).toBeDefined();
    expect(db.emails).toBeDefined();
    expect(db.emailLabelsConfig).toBeDefined();
    expect(db.humanTypes).toBeDefined();
    expect(db.humanRouteSignups).toBeDefined();
    expect(db.phones).toBeDefined();
    expect(db.phoneLabelsConfig).toBeDefined();
  });

  it("exports activity tables", () => {
    expect(db.activities).toBeDefined();
    expect(db.activityTypeValues).toBeDefined();
  });

  it("exports geo-interest tables", () => {
    expect(db.geoInterests).toBeDefined();
    expect(db.geoInterestExpressions).toBeDefined();
  });

  it("exports account tables", () => {
    expect(db.accounts).toBeDefined();
    expect(db.accountTypesConfig).toBeDefined();
    expect(db.accountTypes).toBeDefined();
    expect(db.accountHumanLabelsConfig).toBeDefined();
    expect(db.accountHumans).toBeDefined();
  });

  it("exports display ID tables and utilities", () => {
    expect(db.displayIdCounters).toBeDefined();
    expect(db.GREEK_ALPHABET).toBeDefined();
    expect(db.DISPLAY_ID_PREFIXES).toBeDefined();
    expect(typeof db.formatDisplayId).toBe("function");
    expect(typeof db.parseDisplayId).toBe("function");
  });

  it("exports error log table", () => {
    expect(db.errorLog).toBeDefined();
  });

  it("exports enum constants", () => {
    expect(db.roles).toBeDefined();
    expect(db.leadSourceCategories).toBeDefined();
    expect(db.leadEventTypes).toBeDefined();
    expect(db.humanStatuses).toBeDefined();
    expect(db.humanTypeValues).toBeDefined();
    expect(db.accountStatuses).toBeDefined();
  });
});
