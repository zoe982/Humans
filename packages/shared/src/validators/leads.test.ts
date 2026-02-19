import { describe, it, expect } from "vitest";
import { createLeadSourceSchema, createLeadEventSchema } from "./leads";

describe("createLeadSourceSchema", () => {
  it("accepts valid input", () => {
    const result = createLeadSourceSchema.parse({ name: "Google Ads", category: "paid" });
    expect(result.name).toBe("Google Ads");
    expect(result.category).toBe("paid");
  });

  it("accepts all valid categories", () => {
    for (const category of ["paid", "organic", "referral", "direct", "event"] as const) {
      expect(createLeadSourceSchema.parse({ name: "Test", category }).category).toBe(category);
    }
  });

  it("rejects empty name", () => {
    expect(() => createLeadSourceSchema.parse({ name: "", category: "paid" })).toThrowError();
  });

  it("rejects name over 100 chars", () => {
    expect(() => createLeadSourceSchema.parse({ name: "a".repeat(101), category: "paid" })).toThrowError();
  });

  it("rejects invalid category", () => {
    expect(() => createLeadSourceSchema.parse({ name: "Test", category: "invalid" })).toThrowError();
  });
});

describe("createLeadEventSchema", () => {
  const validInput = {
    clientId: "c-1",
    eventType: "inquiry" as const,
  };

  it("accepts valid input", () => {
    const result = createLeadEventSchema.parse(validInput);
    expect(result.clientId).toBe("c-1");
    expect(result.eventType).toBe("inquiry");
  });

  it("accepts all valid event types", () => {
    for (const eventType of ["inquiry", "quote_requested", "quote_sent", "follow_up", "booking", "conversion", "lost"] as const) {
      expect(createLeadEventSchema.parse({ ...validInput, eventType }).eventType).toBe(eventType);
    }
  });

  it("accepts optional notes", () => {
    const result = createLeadEventSchema.parse({ ...validInput, notes: "Called client" });
    expect(result.notes).toBe("Called client");
  });

  it("accepts optional metadata", () => {
    const result = createLeadEventSchema.parse({ ...validInput, metadata: { source: "web" } });
    expect(result.metadata).toStrictEqual({ source: "web" });
  });

  it("rejects empty clientId", () => {
    expect(() => createLeadEventSchema.parse({ ...validInput, clientId: "" })).toThrowError();
  });

  it("rejects invalid eventType", () => {
    expect(() => createLeadEventSchema.parse({ ...validInput, eventType: "invalid" })).toThrowError();
  });

  it("rejects notes over 5000 chars", () => {
    expect(() => createLeadEventSchema.parse({ ...validInput, notes: "a".repeat(5001) })).toThrowError();
  });
});
