import { describe, it, expect } from "vitest";
import {
  updateRouteSignupStatusSchema,
  updateRouteSignupSchema,
  routeSignupStatuses,
} from "./route-signups";

describe("routeSignupStatuses", () => {
  it("contains expected statuses", () => {
    expect(routeSignupStatuses).toContain("open");
    expect(routeSignupStatuses).toContain("pending_response");
    expect(routeSignupStatuses).toContain("closed_lost");
    expect(routeSignupStatuses).toContain("closed_converted");
  });

  it("has exactly 4 statuses", () => {
    expect(routeSignupStatuses).toHaveLength(4);
  });
});

describe("updateRouteSignupStatusSchema", () => {
  it("accepts valid status", () => {
    const result = updateRouteSignupStatusSchema.parse({ status: "pending_response" });
    expect(result.status).toBe("pending_response");
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

  it("accepts loss_reason string", () => {
    const result = updateRouteSignupSchema.parse({ loss_reason: "No Response" });
    expect(result.loss_reason).toBe("No Response");
  });

  it("accepts nullable loss_reason", () => {
    const result = updateRouteSignupSchema.parse({ loss_reason: null });
    expect(result.loss_reason).toBeNull();
  });

  it("rejects loss_reason over 255 chars", () => {
    expect(() => updateRouteSignupSchema.parse({ loss_reason: "a".repeat(256) })).toThrowError();
  });

  it("accepts loss_notes string", () => {
    const result = updateRouteSignupSchema.parse({ loss_notes: "Never replied to follow-ups" });
    expect(result.loss_notes).toBe("Never replied to follow-ups");
  });

  it("accepts nullable loss_notes", () => {
    const result = updateRouteSignupSchema.parse({ loss_notes: null });
    expect(result.loss_notes).toBeNull();
  });

  it("rejects loss_notes over 5000 chars", () => {
    expect(() => updateRouteSignupSchema.parse({ loss_notes: "a".repeat(5001) })).toThrowError();
  });
});
