import { describe, it, expect } from "vitest";
import {
  updateRouteSignupStatusSchema,
  updateRouteSignupSchema,
  routeSignupStatuses,
} from "./route-signups";

describe("routeSignupStatuses", () => {
  it("contains expected statuses", () => {
    expect(routeSignupStatuses).toContain("open");
    expect(routeSignupStatuses).toContain("qualified");
    expect(routeSignupStatuses).toContain("closed_converted");
    expect(routeSignupStatuses).toContain("closed_rejected");
  });

  it("has exactly 4 statuses", () => {
    expect(routeSignupStatuses).toHaveLength(4);
  });
});

describe("updateRouteSignupStatusSchema", () => {
  it("accepts valid status", () => {
    const result = updateRouteSignupStatusSchema.parse({ status: "qualified" });
    expect(result.status).toBe("qualified");
  });

  it("accepts all valid statuses", () => {
    for (const status of routeSignupStatuses) {
      expect(updateRouteSignupStatusSchema.parse({ status }).status).toBe(status);
    }
  });

  it("rejects missing status", () => {
    expect(() => updateRouteSignupStatusSchema.parse({})).toThrowError();
  });

  it("rejects invalid status", () => {
    expect(() => updateRouteSignupStatusSchema.parse({ status: "invalid" })).toThrowError();
  });
});

describe("updateRouteSignupSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(updateRouteSignupSchema.parse({})).toStrictEqual({});
  });

  it("accepts partial status update", () => {
    const result = updateRouteSignupSchema.parse({ status: "closed_converted" });
    expect(result.status).toBe("closed_converted");
  });

  it("accepts optional note", () => {
    const result = updateRouteSignupSchema.parse({ note: "Follow up needed" });
    expect(result.note).toBe("Follow up needed");
  });

  it("rejects note over 5000 chars", () => {
    expect(() => updateRouteSignupSchema.parse({ note: "a".repeat(5001) })).toThrowError();
  });
});
