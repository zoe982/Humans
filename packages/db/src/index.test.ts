import { describe, it, expect } from "vitest";
import * as db from "./index";

describe("package root exports", () => {
  it("exports createId", () => {
    expect(typeof db.createId).toBe("function");
  });

  it("exports original schema tables", () => {
    expect(db.colleagues).toBeDefined();
    expect(db.clients).toBeDefined();
    expect(db.pets).toBeDefined();
    expect(db.flights).toBeDefined();
    expect(db.flightBookings).toBeDefined();
    expect(db.leadSources).toBeDefined();
    expect(db.leadEvents).toBeDefined();
    expect(db.auditLog).toBeDefined();
  });

  it("exports new human-related tables", () => {
    expect(db.humans).toBeDefined();
    expect(db.humanEmails).toBeDefined();
    expect(db.humanTypes).toBeDefined();
    expect(db.humanRouteSignups).toBeDefined();
    expect(db.humanPhoneNumbers).toBeDefined();
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
    expect(db.accountEmailLabelsConfig).toBeDefined();
    expect(db.accountEmails).toBeDefined();
    expect(db.accountPhoneLabelsConfig).toBeDefined();
    expect(db.accountPhoneNumbers).toBeDefined();
  });

  it("exports label config tables", () => {
    expect(db.humanEmailLabelsConfig).toBeDefined();
    expect(db.humanPhoneLabelsConfig).toBeDefined();
  });

  it("exports error log table", () => {
    expect(db.errorLog).toBeDefined();
  });

  it("exports enum constants", () => {
    expect(db.roles).toBeDefined();
    expect(db.clientStatuses).toBeDefined();
    expect(db.flightStatuses).toBeDefined();
    expect(db.bookingStatuses).toBeDefined();
    expect(db.leadSourceCategories).toBeDefined();
    expect(db.leadEventTypes).toBeDefined();
    expect(db.humanStatuses).toBeDefined();
    expect(db.humanTypeValues).toBeDefined();
    expect(db.accountStatuses).toBeDefined();
  });
});
